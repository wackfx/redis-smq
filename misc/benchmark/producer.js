'use strict';

const config = require('./config');
const { Producer, Message } = require('../..'); // require('redis-smq');

const producer = new Producer(config);

let sequence = Date.now();
const produceForever = () => {
  const message = new Message();
  message.setBody(`Payload sample ${sequence++}`).setQueue('test_queue');
  producer.produce(message, (err) => {
    if (err) throw err;
    else produceForever();
  });
};

produceForever();
