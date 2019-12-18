const qrpc = require('qrpc-web');
const Client = require('../src/client');
const cmd = require('./cmd');

const { Config } = qrpc;

(async function() {
  const client = new Client({
    addr: '39.106.68.245',
    port: 8888,
    conf: new Config({
      dialTimeout: 1000,
      requestTimeout: 2000
    }),
    onopen: e => {
      console.log(e);
    },
    onmessage: e => {
      console.log('recieved:', e);
    }
  });

  try {
    await client.connect();
    const frame = await client.request({
      cmd: cmd.LoginCmd,
      payload: JSON.stringify({
        app: 3,
        uid: 'cs1',
        device: 'mac',
        token: 'cs'
      })
    });
    console.log('login:', frame.payload);

    setInterval(async () => {
      const frame = await client.request({
        cmd: cmd.CSHeartBeatCmd,
        payload: ''
      });
      console.log('heartbeat:', frame.payload);
    }, 3000);
  } catch (errer) {
    console.errer(errer);
  }
})();
