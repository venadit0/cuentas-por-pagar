module.exports = function override(config, env) {
  // Disable error overlay in development
  if (env === 'development') {
    config.devServer = {
      ...config.devServer,
      client: {
        overlay: false, // Disable error overlay completely
      },
    };
  }
  
  return config;
};
