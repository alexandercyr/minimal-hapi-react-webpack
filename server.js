'use strict';

var config = require('./config/config');
var path = require('path');
var Hapi = require('hapi');
var H2o2 = require('h2o2');
var Inert = require('inert');
var Vision = require('vision');
var HapiReactViews = require('hapi-react-views');



var server = new Hapi.Server();
var plugins = [
    {register: Inert}, // enables serving static files (file and directory handlers)
    {register: H2o2},  // enables proxying requests to webpack dev server (proxy handler)
    {register: Vision} // enables rendering views with custom engines (view handler)
];

server.connection({
    host: config.server.host,
    port: config.server.port
});

server.register(plugins, function (err) {

    if (err) {
        console.error(err);
        return;
    }

    // Set up server side react views using Vision
    server.views({
        engines: {jsx: HapiReactViews},
        path: config.paths.views
    });

    // Note: only one route per will be used to fulfill a request.
    // In case of multiple routes matching the URL, the most "specific" route wins.
    // See http://hapijs.com/api#path-matching-order

    if (config.env.isDevelopment) {
        // Proxy webpack requests to webpack-dev-server
        // Note: in development webpack bundles are served from memory, not filesystem
        server.route({
            method: 'GET',
            path: config.publicPaths.build + '{path*}', // this includes HMR patches, not just webpack bundle files
            handler: {
                proxy: {
                    host: config.server.host,
                    port: config.webpack.port
                }
            }
        });
    }

    // Serve all files from the static directory
    // Note: in production this also serves webpack bundles
    server.route({
        method: 'GET',
        path: config.publicPaths.static + '{path*}',
        handler: {
            directory: {
                path: config.paths.static,
                index: false,
                listing: false,
                showHidden: false
            }
        }
    });

    // Serve white-listed files from the public directory
    config.server.publicFiles.forEach(
        function (filename) {
            server.route({
                method: 'GET',
                path: '/' + filename,
                handler: {
                    file: {
                        path: path.resolve(config.paths.public, filename)
                    }
                }
            });
        }
    );

    // Catch-all
    server.route({
        method: 'GET',
        path: '/{path*}',
        handler: function (request, reply) {
            reply('Hapi catch-all view for /' + encodeURIComponent(request.params.path));
        }
    });

    // App
    server.route({
        method: 'GET',
        path: '/',
        handler: {
            view: 'app' // app.jsx in /views
        }
    });

    // Sandbox
    server.route({
        method: 'GET',
        path: '/sandbox',
        handler: {
            view: 'sandbox' // sandbox.jsx in /views
        }
    });

    server.start(function () {
        console.log('Hapi server started!');
    });
});