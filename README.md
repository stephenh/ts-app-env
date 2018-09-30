
# ts-config-spec

A config library for TypeScript.

This is a small library for encapsulating access to an application's config.

Currently just environment variables.

## Goals

The main goals are:

1. Declare all of an application's config in a single place.

   This helps understanding and maintaining an application's config vs. grepping for `process.env.FOO` calls spread throughout the codebase.

2. Perform a simple "all of the config values are available" sanity check immediately on application boot.

   This prevents an application booting and then ~seconds/minutes later blowing up because a `process.env.VERY_IMPORTANT_SETTING` is not available.

## Non-Goals

* Loading config from disk.

  This library currently doesn't try to load YAML, JSON, TOML, etc. files from disk; it's generally assumed you're running in a Node/container environment where environmet variables are the primary means of configuration.

  In theory the `ConfigContext` type decouples `ts-config-spec` from the actual Node/process/etc. environment, so you could provide other implementations.

  You can also use something like `dotenv` to load files from disk into `process.env` and then use `ts-config-spec` from there.

## Usage

First declare your config in a class via the `string`, `number`, etc. options:

```typescript
import { string, number } from 'ts-spec-config';

class AppEnv {
  PORT = number();

  SOME_URL = string();
}
```

And then instantiate it:

```
import { ConfigContext, newConfig } from 'ts-spec-config';

const context = new ConfigContext(process.env);
export const env = newConfig(AppEnv, context);
```

`newConfig` will fail if any non-optional config parameters are not available.

Then in the rest of your application, you can import `env`:

```
import { env } from 'env.ts';

env.SOME_URL; // already ensured to be set
```

## Configuration

The library supports both a convention of "property name == environment name" that allow succint declaration:

```
class AppEnv {
  PORT = number();
```

As well as customization of each property via an `options` hash:

```
class AppEnv {
  port = number({
    env: 'CUSTOM_ENV_NAME',
    default: 8080,
    optional: true,
  });
}
```

Where:

* `env` provides the environment name to look up; if not provided it defaults to the property name snake-cased (e.g. `someThing` will be looked up as `SOME_THING`)
* `default` provides a default value to use if the environment value is not set
* `optional` marks the option as optional, and will change the return type e.g. from `port: number` to `port: number | undefined`

