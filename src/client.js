const net = require('net');
const qrpc = require('qrpc-web');

const { Completer, Frame } = qrpc;
const noop = () => {};

class Client {
  constructor({
    conf,
    addr,
    port,
    onopen = noop,
    onclose = noop,
    onerror = noop,
    onmessage = noop,
    onrequest = noop
  }) {
    this.conf = conf;
    this.respCache = {};
    this.addr = addr;
    this.port = port;
    this.onopen = onopen;
    this.onclose = onclose;
    this.onerror = onerror;
    this.onmessage = onmessage;
    this.onrequest = onrequest;
    this.socket = null;
  }

  connect() {
    const connectCompleter = new Completer();

    const socket = (this.socket = new net.Socket());

    socket.connect(this.port, this.addr, () => {
      this.onopen();
      connectCompleter.success();
    });

    socket.on('error', e => {
      this.onerror(e);
      connectCompleter.fail(e);
    });

    socket.on('close', e => {
      this.onclose(e);
    });

    socket.on('data', e => {
      if (typeof e === 'string') {
        return;
      }
      this.onmessage(e);
      const frame = Frame.decode(e);
      if (frame.requestID in this.respCache) {
        this.respCache[frame.requestID].success(frame);
        delete this.respCache[frame.requestID];
      }
    });

    return connectCompleter.getPromise();
  }

  request({ cmd, payload, flags = 0 }) {
    const frame = new Frame({
      cmd,
      payload,
      flags
    });
    const bytes = frame.encode();
    this.socket.write(bytes);
    this.onrequest({
      cmd,
      payload,
      flags
    });
    const requestID = frame.requestID;
    this.respCache[requestID] = new Completer(this.conf.requestTimeout);
    return this.respCache[requestID].getPromise();
  }

  close() {
    if (this.socket) {
      this.socket.close();
      for (let rq in this.respCache) {
        this.respCache[rq].fail('server closed');
      }
      this.respCache = {};
    }
  }
}

module.exports = Client;
