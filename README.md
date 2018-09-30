# ts-spec-config

A config library for TypeScript.

This is a small library for encapsulating access to an application's config (currently just environment variables).

## Goals

The main goals are:

1. Declare all of an application's config in a single place,

   This helps understanding and maintaining an application's config vs. grepping for `process.env.FOO` calls spread throughout the codebase.

2. Perform simple "all of the config values are available" check immediately on application boot.

   This prevents an application booting and then ~seconds/minutes later blowing up because a `process.env.IMPORTANT_SETTING` is not available.

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

Then in the rest of your application, you can import `env`:

```
import { env } from 'env.ts';

env.SOME_URL; // already ensured to be set
```

## Configuration

The library supports both a convention of "property name == environment name" that is succint:

```
class AppEnv {
  PORT = number();
```

But can also be customized:

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

