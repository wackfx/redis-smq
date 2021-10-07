# Configuration

Before running a Producer or a Consumer instance, an object containing the configuration parameters can be supplied
to the class constructor in order to configure the message queue.

A configuration object may look like:

```javascript
'use strict';

const path = require('path');

module.exports = {
    namespace: 'my_project_name',
    redis: {
        client: 'redis',
        options: {
            host: '127.0.0.1',
            port: 6379,
            connect_timeout: 3600000,
        },
    },
    log: {
        enabled: 0,
        options: {
            level: 'trace',
            /*
            streams: [
                {
                    path: path.normalize(`${__dirname}/../logs/redis-smq.log`)
                },
            ],
            */
        },
    },
    monitor: {
        enabled: true,
        host: '127.0.0.1',
        port: 3000,
    },
};
```

**Parameters**

- `namespace` *(String): Optional.* The namespace for message queues. It can be composed only of letters (a-z),
  numbers (0-9) and (-_) characters. Namespace can be for example configured per project.

- `redis` *(Object): Optional.* Redis client parameters. If not provided the `redis` client would be used by default.

- `redis.client` *(String): Optional.* Redis client name. Can be either `redis` or `ioredis`.

- `redis.options` *(Object): Optional.* Redis client options.
   - See https://github.com/NodeRedis/node_redis#options-object-properties for all valid parameters for `redis` client.
   - See https://github.com/luin/ioredis/blob/master/API.md#new_Redis for all valid `ioredis` parameters.

- `log` *(Object): Optional.* See [Logs Configuration](logs.md#configuration) for more details.

- `monitor` *(Object): Optional.* See [Web UI Configuration](web-ui.md#configuration) for more details.

- `priorityQueue` *(Boolean): Optional.*  See [Priority Queues Configuration](priority-queues.md#configuration) for more details.