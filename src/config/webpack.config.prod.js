import ExtractTextPlugin from 'extract-text-webpack-plugin';
import Visualizer from 'webpack-visualizer-plugin';
import UglifyJSPlugin from 'uglifyjs-webpack-plugin';
import getEntry from '../utils/getEntry';
import getTheme from '../utils/getTheme';
import getCSSLoaders from '../utils/getCSSLoaders';
import addExtraBabelIncludes from '../utils/addExtraBabelIncludes';
import {
  getBabelOptions,
  baseSvgLoader,
  spriteSvgLoader,
  defaultDevtool,
  getResolve,
  getFirstRules,
  getCSSRules,
  getLastRules,
  getCommonPlugins,
  node,
} from './common';

export default function (args, appBuild, config, paths) {
  const { debug, analyze } = args;
  const NODE_ENV = debug ? 'development' : process.env.NODE_ENV;
  console.log('env is', NODE_ENV);

  const {
    publicPath = '/',
    library = null,
    libraryTarget = 'var',
    devtool = debug ? defaultDevtool : false,
  } = config;

  const babelOptions = getBabelOptions(config);
  const cssLoaders = getCSSLoaders(config);
  const theme = getTheme(process.cwd(), config);

  // Support hash
  const jsFileName = config.hash ? '[name].[chunkhash:8]' : '[name]';
  const cssFileName = config.hash ? '[name].[contenthash:8]' : '[name]';

  const output = {
    path: appBuild,
    filename: `${jsFileName}.js`,
    publicPath,
    libraryTarget,
    chunkFilename: `${jsFileName}.async.js`,
  };

  if (library) output.library = library;

  // 打包转换的配置文件
  const uglifyJsPluginConfig = {
    cache: true,    // 开启文件缓存
    parallel: true, // 开启异步线程cpu
    // 原始的设置项目
    uglifyOptions: {
      compress: {
        warnings: false,
      },
      mangle: false,
      output: {
        comments: false,
        ascii_only: true,
      },
    },
  };

  const finalWebpackConfig = {
    bail: true,
    devtool,
    entry: getEntry(config, paths.appDirectory, /* isBuild */true),
    output,
    ...getResolve(config, paths),
    module: {
      rules: [
        ...getFirstRules({ paths, babelOptions }),
        ...getCSSRules('production', { config, paths, cssLoaders, theme }),
        ...getLastRules({ paths, babelOptions }),
      ],
    },
    plugins: [
      // NOTE：该部分配置，在webpack2中被删掉了
      // ...(watch ? [] : [
      //   new webpack.optimize.OccurrenceOrderPlugin(),
      //   new webpack.optimize.DedupePlugin(),
      // ]),
      new ExtractTextPlugin({
        filename: `${cssFileName}.css`,
        allChunks: true,
      }),
      ...getCommonPlugins({
        config,
        paths,
        appBuild,
        NODE_ENV,
      }),
      ...(debug ? [] : [new UglifyJSPlugin(uglifyJsPluginConfig)]),
      ...(analyze ? [new Visualizer()] : []),
    ],
    externals: config.externals,
    node,
  };

  // 正式打包时候的配置参数
  if (!debug) {
    console.log('---------------------------');
    console.log('uglifyJsPluginConfig', uglifyJsPluginConfig);
    console.log('---------------------------');
  }

  if (config.svgSpriteLoaderDirs) {
    baseSvgLoader.exclude = config.svgSpriteLoaderDirs;
    spriteSvgLoader.include = config.svgSpriteLoaderDirs;
    finalWebpackConfig.module.rules.push(baseSvgLoader);
    finalWebpackConfig.module.rules.push(spriteSvgLoader);
  } else {
    finalWebpackConfig.module.rules.push(baseSvgLoader);
  }

  return addExtraBabelIncludes(finalWebpackConfig, paths, config.extraBabelIncludes, babelOptions);
}
