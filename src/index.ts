
/** Validates the config defined by {@code SpecType} and returns a valid instance. */
export function newConfig<S>(SpecType: new () => S, context: ConfigContext, skipErrors: boolean = false): S {
  // start with a brand new instance of S
  const instance = {} as S;
  const errors: Error[] = [];
  // go through our spec version of S that the type system thinks has primitives
  // but are really ConfigOptions that we've casted to the primitive
  const spec = new SpecType();
  Object.entries(spec).forEach(([k, v]) => {
    try {
      (instance as any)[k] = (v as ConfigOption<any>).getValue(k, context);
    } catch (e) {
      errors.push(e);
    }
  });
  if (errors.length > 0 && !skipErrors) {
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
type ConfigOption<T> = {
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
export function number(): number;
export function number(options: ConfigOptionSettings<number> & { optional: true }): number | undefined;
export function number(options: ConfigOptionSettings<number>): number;
export function number(options: ConfigOptionSettings<number> = {}): number | undefined {
  return option<number>(options, s => {
    const v = parseInt(s, 10);
    if (isNaN(v)) {
      throw new Error("is not a number");
    }
    return v;
  });
}

/** Construct a config option that is a string. */
export function string(): string;
export function string(options: ConfigOptionSettings<string> & { optional: true }): string | undefined;
export function string(options: ConfigOptionSettings<string>): string;
export function string(options: ConfigOptionSettings<string> = {}): string | undefined {
  return option<string>(options, s => s);
}

/** Construct a generic config option. */
export function option<V>(options: ConfigOptionSettings<V>, parser: (s: string) => V): V {
  const option: ConfigOption<V> = {
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
  return option as any as V;
}

function snakeAndUpIfNeeded(propertyName: string): string {
  if (propertyName.includes("_")) {
    return propertyName; // assume it's already FOO_BAR
  } else {
    return propertyName.replace(/([A-Z])/g, l => "_" + l).toUpperCase();
  }
}
