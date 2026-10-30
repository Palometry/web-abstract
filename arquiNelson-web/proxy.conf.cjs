const target = 'http://127.0.0.1:8000';

function removeBackendHeaders(proxy) {
  proxy.on('proxyRes', (proxyResponse) => {
    delete proxyResponse.headers.host;
    delete proxyResponse.headers.server;
    delete proxyResponse.headers['x-powered-by'];
  });
}

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    configure: removeBackendHeaders,
  },
  '/uploads': {
    target,
    secure: false,
    changeOrigin: true,
    configure: removeBackendHeaders,
  },
};
