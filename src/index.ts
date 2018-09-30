/**
 * An application's top-level configuration spec.
 *
 * The type param {@code S} is the spec type itself, and just lets us enforce
 * that every property in the spec type is a ConfigOption.
 */
export type ConfigSpec<T> = { [K in keyof T]: ConfigOption<any> };

/**
 * Given a config spec S, represents the instantiated version.
 *
 * E.g. while the spec will have a {@code name} property that is a {@code ConfigOption},
 * the config instance's name {@code name} property is the resolved {@code string} value.
 */
export type ConfigInstance<S> = {
  [K in keyof S]: S[K] extends ConfigOption<infer O> ? O : never
};

/** Validates the config defined by {@code spec} and returns a valid instance. */
export function newConfig<S extends ConfigSpec<S>>(
  SpecType: new () => S,
  context: ConfigContext
): ConfigInstance<S> {
  const instance = {} as ConfigInstance<S>;
  const errors: Error[] = [];
  const spec = new SpecType() as ConfigSpec<any>;
  Object.entries(spec).forEach(([k, v]) => {
    try {
      (instance as any)[k] = v.getValue(k, context);
    } catch (e) {
      errors.push(e);
    }
  });
  if (errors.length > 0) {
    throw new ConfigError(errors.map(e => e.message).join(", "));
  }
  return instance;
}

export type EnvVars = { [name: string]: string | undefined };

/** Decouples config evaluation from the environment. */
export class ConfigContext {
  envVars: EnvVars;

  constructor(envVars: EnvVars) {
    this.envVars = envVars;
  }
}

export class ConfigError extends Error {}

/** An individual config option, e.g. a string/int. */
export type ConfigOption<T> = {
  getValue(propertyName: string, context: ConfigContext): T | undefined;
};

/** The settings that can be defined for each configuration option. */
export type ConfigOptionSettings<V> = {
  /** The environment variable name. */
  env?: string;

  /** The default value to use if the environment variable is not set. */
  default?: V;

  /** If this is optional, in which case the type should be {@code V | undefined}. */
  optional?: Boolean;
};

/** Construct a config option that is a number. */
export function number(): ConfigOption<number>;
export function number(
  options: ConfigOptionSettings<number> & { optional: true }
): ConfigOption<number | undefined>;
export function number(
  options: ConfigOptionSettings<number>
): ConfigOption<number>;
export function number(
  options: ConfigOptionSettings<number> = {}
): ConfigOption<number | undefined> {
  return option<number>(options, s => {
    const v = parseInt(s, 10);
    if (isNaN(v)) {
      throw new Error("is not a number");
    }
    return v;
  });
}

/** Construct a config option that is a string. */
export function string(): ConfigOption<string>;
export function string(
  options: ConfigOptionSettings<string> & { optional: true }
): ConfigOption<string | undefined>;
export function string(
  options: ConfigOptionSettings<string>
): ConfigOption<string>;
export function string(
  options: ConfigOptionSettings<string> = {}
): ConfigOption<string | undefined> {
  return option<string>(options, s => s);
}

/** Construct a generic config option. */
export function option<V>(
  options: ConfigOptionSettings<V>,
  parser: (s: string) => V
): ConfigOption<V> {
  return {
    getValue(propertyName, context) {
      // use propertyName if they didn't specify an env
      const envName = options.env || snakeAndUpIfNeeded(propertyName);
      const envValue = context.envVars[envName];
      if (envValue) {
        try {
          return parser(envValue);
        } catch (e) {
          throw new ConfigError(`${envName} ${e.message}`);
        }
      }
      if (options.default) {
        return options.default;
      }
      if (options.optional) {
        return undefined;
      }
      throw new ConfigError(`${envName} is not set`);
    }
  };
}

function snakeAndUpIfNeeded(propertyName: string): string {
  if (propertyName.includes("_")) {
    return propertyName; // assume it's already FOO_BAR
  } else {
    return propertyName.replace(/([A-Z])/g, l => "_" + l).toUpperCase();
  }
}
