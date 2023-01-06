<div align="center" style="text-align: center">
  <p><a href="https://github.com/weyoss/redis-smq"><img alt="RedisSMQ" src="./logo.png" /></a></p>
  <p>A simple high-performance Redis message queue for Node.js.</p>
</div>

# RedisSMQ

<p>
   <a href="https://github.com/weyoss/redis-smq/actions/workflows/tests.yml"><img src="https://github.com/weyoss/redis-smq/actions/workflows/tests.yml/badge.svg" alt="Tests" style="max-width:100%;" /></a>
   <a href="https://github.com/weyoss/redis-smq/actions/workflows/codeql.yml" rel="nofollow"><img src="https://github.com/weyoss/redis-smq/actions/workflows/codeql.yml/badge.svg" alt="Code quality" /></a>
   <a href="https://codecov.io/github/weyoss/redis-smq?branch=master" rel="nofollow"><img src="https://img.shields.io/codecov/c/github/weyoss/redis-smq" alt="Coverage Status" /></a>
   <a href="https://npmjs.org/package/redis-smq" rel="nofollow"><img src="https://img.shields.io/npm/v/redis-smq.svg" alt="NPM version" /></a>
   <a href="https://npmjs.org/package/redis-smq" rel="nofollow"><img src="https://img.shields.io/npm/dm/redis-smq.svg" alt="NPM downloads" /></a>
</p>

RedisSMQ is a Node.js library for queuing messages (aka jobs) and processing them asynchronously with consumers. Backed by Redis, it allows scaling up your application with ease of use.

## Features

* **[High-performance message processing](/docs/performance.md)**.
* **[Multi-Queue Producers](#producer) & [Multi-Queue Consumers](#consumer)**: Offering flexible Producer/Consumer models, with focus on simplicity and without tons of features. This can make RedisSMQ an ideal message broker for your microservices. 
* **[at-least-once/at-most-once Delivery](/docs/api/message.md#messageprototypesetretrythreshold)**: In case of failures, while delivering or processing a message, RedisSMQ can guaranty that the message will be not lost and redelivered again. When configured to do so, RedisSMQ can also ensure that the message is delivered at-most-once.
* **[Different Exchange Types](/docs/message-exchanges.md)**: RedisSMQ offers 3 types of exchanges: [Direct Exchange](/docs/message-exchanges.md#direct-exchange), [Topic Exchange](/docs/message-exchanges.md#topic-exchange), and [Fanout Exchange](/docs/message-exchanges.md#fanout-exchange) for publishing a message to one or multiple queues. 
* **[FIFO queues, LIFO queues, and Reliable Priority Queues](/docs/queues.md)**: Provides different queuing strategies that you may use depending on your needs and requirements.
* **[Message Expiration](/docs/api/message.md#messageprototypesetttl)**: Allowing a message to expire if it has not been delivered within a given amount of time.
* **[Message Consumption Timeout](/docs/api/message.md#messageprototypesetconsumetimeout)**: Allowing to set up a timeout for consuming messages.
* **[Queue Rate Limiting](/docs/queue-rate-limiting.md)**: Allowing to control the rate at which the messages are consumed from a given queue.
* **[Scheduling Messages](/docs/scheduling-messages.md)**: Messages can be configured to be delayed, delivered for N times with an optional period between deliveries, and to be scheduled using CRON expressions.
* **[Multiplexing](/docs/multiplexing.md)**: A feature which allows message handlers to use a single redis connection to dequeue and consume messages.  
* **[HTTP API](https://github.com/weyoss/redis-smq-monitor)**: an HTTP interface is provided to interact with the MQ.
* **[Web UI](https://github.com/weyoss/redis-smq-monitor-client)**: RedisSMQ can be managed also from your web browser.
* **[Logging](https://github.com/weyoss/redis-smq-common/blob/master/docs/logs.md)**: RedisSMQ comes with a built-in JSON logger, but can also use your application logger.
* **[Configurable](/docs/configuration.md)**: Many options and features can be configured.
* **[Multiple Redis clients](/docs/configuration.md)**: Depending on your preferences, RedisSMQ can use either [node-redis v3](https://github.com/redis/node-redis/tree/v3.1.2), [node-redis v4](https://github.com/redis/node-redis), or [ioredis](https://github.com/luin/ioredis).
* **[Highly optimized](https://lgtm.com/projects/g/weyoss/redis-smq/context:javascript)**: Strongly-typed and implemented using pure callbacks, with small memory footprint and no memory leaks. See [Callback vs Promise vs Async/Await benchmarks](https://gist.github.com/weyoss/24f9ecbda175d943a48cb7ec38bde821).


### RedisSMQ Use Case: Multi-Queue Producers & Multi-Queue Consumers

&nbsp;

![RedisSMQ Overview](/docs/redis-smq-overview.png)

## Table of Content

1. [What's new?](#whats-new)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Usage](#usage)
   1. [Basics](#basics)
       1. [Message](#message)
       2. [Producer](#producer)
       3. [Consumer](#consumer)
          1. [Message Acknowledgement](#message-acknowledgement)
   2. [Advanced Topics](#advanced-topics)
      1. [Scheduling Messages](/docs/scheduling-messages.md)
      2. [Message Exchanges](/docs/message-exchanges.md)
      3. [Queue Rate Limiting](/docs/queue-rate-limiting.md)
      4. [Multiplexing](/docs/multiplexing.md)
      5. [Message Manager](/docs/api/message-manager.md)
      6. [Queue Manager](/docs/api/queue-manager.md)
      7. [HTTP API](https://github.com/weyoss/redis-smq-monitor)
      8. [Web UI](https://github.com/weyoss/redis-smq-monitor-client)
      9. [Logs](https://github.com/weyoss/redis-smq-common/blob/master/docs/logs.md)
5. [RedisSMQ Architecture](/docs/redis-smq-architecture.md)
6. [Performance](#performance)
7. [Contributing](#contributing)
8. [License](#license)

## What's new?

**2023.01.06**

:rocket: RedisSMQ v7.2 is released! Before this release RedisSMQ supported both LIFO queues and Priority queues. 
With this new release, RedisSMQ now provides FIFO queues as a third option that completes the list of supported queue types. 
For more details see [Queues](/docs/queues.md).

## Installation

```text
npm install redis-smq-common redis-smq --save
```

Considerations:

- Minimal Node.js version is >= 14 (RedisSMQ is tested under current active LTS and maintenance LTS Node.js releases).
- Minimal Redis server version is 2.6.12 (RedisSMQ is tested under Redis v2.6, v3, v4, v5, and v6).

## Configuration

See [Configuration](/docs/configuration.md) for more details.

## Usage

### Basics

RedisSMQ provides 3 classes in order to work with the message queue: `Message`, `Producer`, and `Consumer`.

Producers and consumers exchange data using one or multiple queues that may be created using the [QueueManager](/docs/api/queue-manager.md).

A queue is responsible for holding messages which are produced by producers and are delivered to consumers.

```javascript
const { QueueManager } = require('redis-smq');
const { EQueueType } = require('redis-smq/dist/types');
const config = require('./config')

QueueManager.createInstance(config, (err, queueManager) => {
  if (err) console.log(err);
  // Creating a LIFO queue
  else queueManager.queue.save('test_queue', EQueueType.LIFO_QUEUE, (err) => console.log(err));
})
```

See [Queues](/docs/queues.md) for more details.

#### Message

`Message` class is responsible for creating messages that may be published. 

A message can carry your application data, sometimes referred to as `message payload`, which may be delivered to a consumer to be processed asynchronously.  

The message payload can be of any valid JSON data type. It may be a simple text message like `Hello world` or a complex data type like `{hello: 'world'}`.

```javascript
const { Message } = require('redis-smq');
const message = new Message();
message
    .setBody({hello: 'world'})
    .setTTL(3600000)
    .setRetryThreshold(5);
```

The `Message` class provides many methods for setting up different message parameters such as message body, message priority, message TTL, etc. 

See [Message Reference](/docs/api/message.md) for more details.

#### Producer

A `Producer` instance allows to publish a message to a queue. 

You can use a single `Producer` instance to produce messages, including messages with priority, to one or multiple queues.

Before publishing a message do not forget to set an exchange for the message using [setQueue()](/docs/api/message.md#messageprototypesetqueue), [setTopic()](/docs/api/message.md#messageprototypesettopic), or [setFanOut()](/docs/api/message.md#messageprototypesetfanout). Otherwise, an error will be returned. See [Message Exchanges](/docs/message-exchanges.md) for more details.

```javascript
'use strict';
const {Message, Producer} = require('redis-smq');

const producer = new Producer();
producer.run((err) => {
   if (err) throw err;
   const message = new Message();
   message
           .setBody({hello: 'world'})
           .setTTL(3600000) // message expiration (in millis)
           .setQueue('test_queue'); // setting up a direct exchange 
   message.getId() // null
   producer.produce(message, (err) => {
      if (err) console.log(err);
      else {
         const msgId = message.getId(); // string
         console.log('Successfully produced. Message ID is ', msgId);
      }
   });
})
```

Starting with v7.0.6, before producing messages you need first to run your producer instance.

See [Producer Reference](/docs/api/producer.md) for more details.

#### Consumer

A `Consumer` instance can be used to receive and consume messages from one or multiple queues.

To consume messages from a queue, the `Consumer` class provides the [consume()](/docs/api/consumer.md#consumerprototypeconsume) method which allows to register a `message handler`. 

A `message handler` is a function that receives a delivered message from a given queue. 

Message handlers can be registered at any time, before or after a consumer has been started. 

In contrast to producers, consumers are not automatically started upon creation. To start a consumer use the [run()](/docs/api/consumer.md#consumerprototyperun) method.

To stop consuming messages from a queue and to remove the associated `message handler` from your consumer, use the [cancel()](/docs/api/consumer.md#consumerprototypecancel) method. 

To shut down completely your consumer and tear down all message handlers, use the [shutdown()](/docs/api/consumer.md#consumerprototypeshutdown) method.

```javascript
'use strict';

const { Consumer } = require('redis-smq');

const consumer = new Consumer();

const messageHandler = (msg, cb) => {
   const payload = msg.getBody();
   console.log('Message payload', payload);
   cb(); // acknowledging the message
};

consumer.consume('test_queue', messageHandler, (err) => {
   if (err) console.error(err);
});

consumer.run();
```

##### Message Acknowledgement

Once a message is received, to acknowledge it, you invoke the callback function without arguments, as shown in the example above. 

Message acknowledgment informs the MQ that the delivered message has been successfully consumed.

If an error occurred while processing a message, you can unacknowledge it by passing in the error to the callback function.

By default, unacknowledged messages are re-queued and delivered again unless **message retry threshold** is exceeded. 

Delivered messages that couldn't be processed or can not be delivered to consumers are moved to a system generated queue called **dead-letter queue (DLQ)**.

By default, RedisSMQ does not store acknowledged and dead-lettered messages for saving disk and memory spaces, and also to increase message processing performance. 

If you need such feature, you can enable it from your [configuration](/docs/configuration.md) object.

See [Consumer Reference](/docs/api/consumer.md) for more details.

### Advanced Topics

* [Scheduling Messages](/docs/scheduling-messages.md)

* [Message Exchanges](/docs/message-exchanges.md)

* [Queue Rate Limiting](/docs/queue-rate-limiting.md)

* [Multiplexing](/docs/multiplexing.md)
  
* [Message Manager](/docs/api/message-manager.md)

* [Queue Manager](/docs/api/queue-manager.md)

* [HTTP API](https://github.com/weyoss/redis-smq-monitor)

* [Web UI](https://github.com/weyoss/redis-smq-monitor-client)

* [Logs](https://github.com/weyoss/redis-smq-common/blob/master/docs/logs.md)

## RedisSMQ Architecture

* See [Architecture Overview](/docs/redis-smq-architecture.md).

## Performance

See [Performance](/docs/performance.md) for more details.

## Contributing

So you are interested in contributing to this project? Please see [CONTRIBUTING.md](https://github.com/weyoss/guidelines/blob/master/CONTRIBUTIONS.md).

## License

[MIT](https://github.com/weyoss/redis-smq/blob/master/LICENSE)
