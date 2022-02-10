type LogFn = (msg: string) => void;
type Logger = { debug?: LogFn; info: LogFn; warn: LogFn; error: LogFn };

/**
 * Creates a new config object, described by the {@code ConfigSpec} instance,
 * after populating/validating it against the {@code env} environment.
 *
 * The {@code ConfigSpec} should be an object literal that looks like:
 *
 * ```typescript
 * const AppEnv = {
 *   prop_a: string(),
 * }
 * ```
 *
 * And calling `newConfig(AppEnv, env)` will return a new object literal
 * that has the same type as `MyEnv`, but with `prop_a` resolved to the
 * `PROP_A` (or as appropriate) env value.
 */
export interface ConfigOptions {
  ignoreErrors?: boolean;

  doNotLogErrors?: boolean;

  /** The NODE_ENV e.g. production or development; used for properties that use `notNeededIn`. */
  nodeEnv?: string;

  /**
   * Pass a custom logger (e.g., a Pino instance).
   *
   * @default - console
   */
  logger?: Logger;
}

export function newConfig<S>(spec: S, env: Environment, options: ConfigOptions = {}): S {
  const errors: Error[] = [];
  // go through our spec version of S that the type system thinks has primitives
  // but are really ConfigOptions that we've casted to the primitive
  const config: Record<string, S | unknown> = {};
  Object.keys(spec).forEach((k) => {
    try {
      const v = (spec as Record<string, unknown>)[k];
      if (v instanceof ConfigOption) {
        config[k] = v.getValue(k, env, options);
      } else if (typeof v === "object") {
        // assume this is a nested config spec
        config[k] = newConfig(v, env, options);
      }
    } catch (e) {
      if (e instanceof Error) {
        errors.push(e);
      } else {
        throw e;
      }
    }
  });
  logOrFailIfErrors(options, errors, options.ignoreErrors || false);
  return Object.freeze(config) as S;
}

function logOrFailIfErrors(options: ConfigOptions, errors: Error[], ignoreErrors: boolean) {
  if (errors.length === 0) {
    return;
  }

  const { logger = console } = options;
  const message = errors.map((e) => e.message).join(", ");
  if (!ignoreErrors) {
    log(logger.error, message, options);
    throw new ConfigError(message);
  } else {
    log(logger.info, `Ignoring errors while instantiating config: ${message}`, options);
  }
}

function log(fn: LogFn, message: string, { doNotLogErrors }: ConfigOptions) {
  if (doNotLogErrors === true) {
    return;
  }

  fn(message);
}

/**
 * The environment to pull setting names out of.
 *
 * This doesn't have to be Node's `process.env`, but that is the general
 * assumption and primary use case.
 */
export interface Environment {
  [name: string]: string | undefined;
}

export class ConfigError extends Error {}

/** An individual config option, e.g. a string/int. */
abstract class ConfigOption<T> {
  public abstract getValue(propertyName: string, env: Environment, appOptions: ConfigOptions): T | undefined;
}

/** The settings that can be defined for each configuration option. */
export interface ConfigOptionSettings<V> {
  /** The environment variable name. */
  env?: string;

  /** The default value to use if the environment variable is not set. */
  default?: V;

  /** If this is optional, in which case the type should be {@code V | undefined}. */
  optional?: boolean;

  /** A list of NODE_ENVs where this setting is not needed in. */
  notNeededIn?: string | string[];
}

/** Construct a config option that is a number. */
export function number(options: ConfigOptionSettings<number> & { optional: true }): number | undefined;
export function number(options?: ConfigOptionSettings<number>): number;
export function number(options: ConfigOptionSettings<number> = {}): number | undefined {
  return option<number>(options, (s) => {
    const v = parseFloat(s);
    if (isNaN(v)) {
      throw new Error("is not a number");
    }
    return v;
  });
}

/** Construct a config option that is a string. */
export function string(options: ConfigOptionSettings<string> & { optional: true }): string | undefined;
export function string(options?: ConfigOptionSettings<string>): string;
export function string(options: ConfigOptionSettings<string> = {}): string | undefined {
  return option<string>(options, (s) => s);
}

/** Construct a config option that is a boolean, only the exact string value 'true' is treated as true, everything else is false. */
export function boolean(options: ConfigOptionSettings<boolean> & { optional: true }): boolean | undefined;
export function boolean(options?: ConfigOptionSettings<boolean>): boolean;
export function boolean(options: ConfigOptionSettings<boolean> = {}): boolean | undefined {
  return option<boolean>(options, (s) => s === "true");
}

/** Construct a generic config option. */
export function option<V>(options: ConfigOptionSettings<V>, parser: (s: string) => V): V {
  const opt = new (class extends ConfigOption<V> {
    public getValue(propertyName: string, env: Environment, appOptions: ConfigOptions) {
      // use propertyName if they didn't specify an env
      const envName = options.env || snakeAndUpIfNeeded(propertyName);
      const envValue = env[envName];
      if (envValue !== undefined) {
        try {
          return parser(envValue);
        } catch (e) {
          if (e instanceof Error) {
            throw new ConfigError(`${envName} ${e.message}`);
          } else {
            throw e;
          }
        }
      }
      if (options.default !== undefined) {
        return options.default;
      }
      if (options.optional) {
        return undefined;
      }
      if (options.notNeededIn !== undefined && appOptions !== undefined && appOptions.nodeEnv !== undefined) {
        if (toList(options.notNeededIn).indexOf(appOptions.nodeEnv) > -1) {
          return undefined;
        }
      }
      throw new ConfigError(`${envName} is not set`);
    }
  })();
  // This is the cute "lie through our teeth to the type system" hack where
  // we pretend our ConfigOption<V> objects are Vs so that we can instaniate
  // the initial "spec" version of the app's config class, which we'll then
  // use to iterate over the ConfigOption<V>'s and resolve them to V's on
  // the real config instance.

  return opt as unknown as V;
}

function snakeAndUpIfNeeded(propertyName: string): string {
  if (propertyName.includes("_") || propertyName.match(/^[A-Z]+$/)) {
    return propertyName; // assume it's already FOO_BAR
  } else {
    return propertyName.replace(/([A-Z])/g, (l) => "_" + l).toUpperCase();
  }
}

function toList(data: string | string[]): string[] {
  return typeof data === "string" ? [data] : data;
}
