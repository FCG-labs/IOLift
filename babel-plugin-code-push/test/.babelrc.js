module.exports = function (api) {
  if (api.env("test")) {
    return {
      presets: [["@babel/preset-env", { targets: { node: "current" } }]],
      plugins: [["../index.js"]],
    };
  }

  return {
    plugins: [["../index.js"]],
  };
};
