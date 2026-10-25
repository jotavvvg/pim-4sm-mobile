const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withLocalCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('Android manifest application entry is missing.');
    }

    application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
};
