/**
 * Creates a new config object, described by the {@code SpecType} constructor,
 * after populating/validating it against the {@code context} environment.
 *
 * SpecType should be a class that looks like:
 *
 * ```typescript
 * class MyEnv {
 *   prop_a = string();
 * }
 * ```
 *
 * And calling `newConfig(MyEnv, context)` will return a `MyEnv` type
 * with `prop_a` resolved to the `PROP_A` (or as appropriate) env value.
 */
export function newConfig<S>(
  SpecType: new () => S,
  context: ConfigContext,
  ignoreErrors: boolean = false
): S {
  const errors: Error[] = [];
  // go through our spec version of S that the type system thinks has primitives
  // but are really ConfigOptions that we've casted to the primitive
  const spec = new SpecType();
  Object.entries(spec).forEach(([k, v]) => {
    try {
      (spec as any)[k] = (v as ConfigOption<any>).getValue(k, context);
    } catch (e) {
      (spec as any)[k] = undefined;
      errors.push(e);
    }
  });
  if (errors.length > 0) {
    const message = errors.map(e => e.message).join(", ");
    if (!ignoreErrors) {
      throw new ConfigError(message);
    } else {
      // In theory should use some configurable log library but typically that would
      // require booting up the very environment/config variables we're trying to resolve.
      // tslint:disable-next-line no-console
      console.log(`Ignoring errors while instantiating config: ${message}`);
    }
  }
  return spec;
}

export interface EnvVars {
  [name: string]: string | undefined;
}

/** Decouples config evaluation from the environment. */
export class ConfigContext {
  public envVars: EnvVars;

  constructor(envVars: EnvVars) {
    this.envVars = envVars;
  }
}

// tslint:disable max-classes-per-file
export class ConfigError extends Error {}

/** An individual config option, e.g. a string/int. */
interface ConfigOption<T> {
  getValue(propertyName: string, context: ConfigContext): T | undefined;
}

/** The settings that can be defined for each configuration option. */
export interface ConfigOptionSettings<V> {
  /** The environment variable name. */
  env?: string;

  /** The default value to use if the environment variable is not set. */
  default?: V;

  /** If this is optional, in which case the type should be {@code V | undefined}. */
  optional?: boolean;
}

/** Construct a config option that is a number. */
export function number(
  options: ConfigOptionSettings<number> & { optional: true }
): number | undefined;
export function number(options?: ConfigOptionSettings<number>): number;
export function number(
  options: ConfigOptionSettings<number> = {}
): number | undefined {
  return option<number>(options, s => {
    const v = parseInt(s, 10);
    if (isNaN(v)) {
      throw new Error("is not a number");
    }
    return v;
  });
}

/** Construct a config option that is a string. */
export function string(
  options: ConfigOptionSettings<string> & { optional: true }
): string | undefined;
export function string(options?: ConfigOptionSettings<string>): string;
export function string(
  options: ConfigOptionSettings<string> = {}
): string | undefined {
  return option<string>(options, s => s);
}

/** Construct a generic config option. */
export function option<V>(
  options: ConfigOptionSettings<V>,
  parser: (s: string) => V
): V {
  const opt: ConfigOption<V> = {
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
  // This is the cute "lie through our teeth to the type system" hack where
  // we pretend our ConfigOption<V> objects are Vs so that we can instaniate
  // the initial "spec" version of the app's config class, which we'll then
  // use to iterate over the ConfigOption<V>'s and resolve them to V's on
  // the real config instance.
  return (opt as any) as V;
}

function snakeAndUpIfNeeded(propertyName: string): string {
  if (propertyName.includes("_")) {
    return propertyName; // assume it's already FOO_BAR
  } else {
    return propertyName.replace(/([A-Z])/g, l => "_" + l).toUpperCase();
  }
}
