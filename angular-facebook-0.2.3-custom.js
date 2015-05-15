/*
---
name: Facebook Angularjs

description: Provides an easier way to make use of Facebook API with Angularjs

license: MIT-style license

authors:
  - Ciul

requires: [angular]
provides: [facebook]

...
*/
(function(window, angular, undefined) {
  'use strict';

  /**
   * Facebook module
   */
  angular.module('facebook', [])

  /**
   * Facebook script loader using getScript
   * Returns promise
   */
  .factory('FacebookScriptLoader', [
    '$q',
    '$rootScope',
    '$timeout',
    '$window',
    '$log',
    function($q, $rootScope, $timeout, $window, $log) {
      var initDeferred;
      var ngFacebookInstance;

      function fetchScript(settings) {
        if (initDeferred) {
          return initDeferred.promise;
        }

        initDeferred = $q.defer();

        var doneLoading = false;
        var error;

        var src = '//connect.facebook.net/' + settings.locale + '/sdk.js';
        // Prefix protocol
        if (['file', 'file:'].indexOf($window.location.protocol) !== -1) {
          src = 'https:' + src;
        }

        // place this here to stop mvp
        $window.fbAsyncInit = function() {
          $log.debug("Successfully loaded facebook");
        };

        $(document).ready(function() {
          //wrap this in ready function

          $window.$.getScript(src,
            function(data, textStatus, jqxhr) {
              doneLoading = true;
              if ($window.FB) {
                FB.init(settings);

                /**
                 * Subscribe to Facebook API events and broadcast through app.
                 */
                angular.forEach({
                  'auth.login': 'login',
                  'auth.logout': 'logout',
                  'auth.prompt': 'prompt',
                  'auth.sessionChange': 'sessionChange',
                  'auth.statusChange': 'statusChange',
                  'auth.authResponseChange': 'authResponseChange',
                  'xfbml.render': 'xfbmlRender',
                  'edge.create': 'like',
                  'edge.remove': 'unlike',
                  'comment.create': 'comment',
                  'comment.remove': 'uncomment'
                }, function(mapped, name) {
                  FB.Event.subscribe(name, function(response) {
                    $timeout(function() {
                      $rootScope.$broadcast('Facebook:' + mapped, response);
                    });
                  });
                });

                initDeferred.resolve();
              } else {
                error = new Error("Facebook SDK Missing [status: " + jqxhr.status + "]");
                initDeferred.reject(error);
              }
            }
          ).fail(function(jqxhr, opts, exception) {
            doneLoading = true;
            error = new Error("Facebook SDK failed to load [status: " + jqxhr.status + "]");
            initDeferred.reject(error);
          });

          $timeout(function() {
            if (!doneLoading) {
              error = new Error("Facebook SDK load timed out [timeout: 60000]");
              initDeferred.reject(error);
            }
          }, 60000);
        });

        return initDeferred.promise;
      }

      return {
        load: function(settings) {
          // return promise
          return fetchScript(settings).then(
            function() {
              if (ngFacebookInstance) {
                return ngFacebookInstance;
              }

              /**
               * This is the NgFacebook class to be retrieved on Facebook Service request.
               */
              function NgFacebook() {
                this.appId = settings.appId;
              }

              NgFacebook.prototype.login = function() {

                var d = $q.defer(),
                  args = Array.prototype.slice.call(arguments),
                  userFn,
                  userFnIndex; // Converts arguments passed into an array

                // Get user function and it's index in the arguments array, to replace it with custom function, allowing the usage of promises
                angular.forEach(args, function(arg, index) {
                  if (angular.isFunction(arg)) {
                    userFn = arg;
                    userFnIndex = index;
                  }
                });

                // Replace user function intended to be passed to the Facebook API with a custom one
                // for being able to use promises.
                if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                  args.splice(userFnIndex, 1, function(response) {
                    $timeout(function() {
                      if (angular.isUndefined(response.error)) {
                        d.resolve(response);
                      } else {
                        d.reject(response);
                      }

                      if (angular.isFunction(userFn)) {
                        userFn(response);
                      }
                    });
                  });
                }

                $window.FB.login.apply($window.FB, args);

                return d.promise;
              };

              /**
               * Map some asynchronous Facebook sdk methods to NgFacebook
               */
              angular.forEach([
                'logout',
                'api',
                'ui',
                'getLoginStatus'
              ], function(name) {
                NgFacebook.prototype[name] = function() {

                  var d = $q.defer(),
                    args = Array.prototype.slice.call(arguments), // Converts arguments passed into an array
                    userFn,
                    userFnIndex;

                  // Get user function and it's index in the arguments array, to replace it with custom function, allowing the usage of promises
                  angular.forEach(args, function(arg, index) {
                    if (angular.isFunction(arg)) {
                      userFn = arg;
                      userFnIndex = index;
                    }
                  });

                  // Replace user function intended to be passed to the Facebook API with a custom one
                  // for being able to use promises.
                  if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                    args.splice(userFnIndex, 1, function(response) {
                      $timeout(function() {

                        if (response && typeof response.error === 'undefined') {
                          d.resolve(response);
                        } else {
                          d.reject(response);
                        }

                        if (angular.isFunction(userFn)) {
                          userFn(response);
                        }
                      });
                    });
                  }

                  $timeout(function() {
                    $window.FB[name].apply(FB, args);
                  });

                  return d.promise;
                };
              });

              /**
               * Map Facebook sdk XFBML.parse() to NgFacebook.
               */
              NgFacebook.prototype.parseXFBML = function() {

                var d = $q.defer();

                $timeout(function() {
                  $window.FB.XFBML.parse();
                  d.resolve();
                });

                return d.promise;
              };

              /**
               * Map Facebook sdk subscribe method to NgFacebook. Renamed as subscribe
               * Thus, use it as Facebook.subscribe in the service.
               */
              NgFacebook.prototype.subscribe = function() {

                var d = $q.defer(),
                  args = Array.prototype.slice.call(arguments), // Get arguments passed into an array
                  userFn,
                  userFnIndex;

                // Get user function and it's index in the arguments array, to replace it with custom function, allowing the usage of promises
                angular.forEach(args, function(arg, index) {
                  if (angular.isFunction(arg)) {
                    userFn = arg;
                    userFnIndex = index;
                  }
                });

                // Replace user function intended to be passed to the Facebook API with a custom one
                // for being able to use promises.
                if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                  args.splice(userFnIndex, 1, function(response) {
                    $timeout(function() {

                      if (response && typeof response.error === 'undefined') {
                        d.resolve(response);
                      } else {
                        d.reject(response);
                      }

                      if (angular.isFunction(userFn)) {
                        userFn(response);
                      }
                    });
                  });
                }

                $timeout(function() {
                  $window.FB.Event.subscribe.apply(FB, args);
                });

                return d.promise;
              };

              /**
               * Map Facebook sdk unsubscribe method to NgFacebook. Renamed as unsubscribe
               * Thus, use it as Facebook.unsubscribe in the service.
               */
              NgFacebook.prototype.unsubscribe = function() {

                var d = $q.defer(),
                  args = Array.prototype.slice.call(arguments), // Get arguments passed into an array
                  userFn,
                  userFnIndex;

                // Get user function and it's index in the arguments array, to replace it with custom function, allowing the usage of promises
                angular.forEach(args, function(arg, index) {
                  if (angular.isFunction(arg)) {
                    userFn = arg;
                    userFnIndex = index;
                  }
                });

                // Replace user function intended to be passed to the Facebook API with a custom one
                // for being able to use promises.
                if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                  args.splice(userFnIndex, 1, function(response) {
                    $timeout(function() {

                      if (response && typeof response.error === 'undefined') {
                        d.resolve(response);
                      } else {
                        d.reject(response);
                      }

                      if (angular.isFunction(userFn)) {
                        userFn(response);
                      }
                    });
                  });
                }

                $timeout(function() {
                  $window.FB.Event.unsubscribe.apply(FB, args);
                });

                return d.promise;
              };

              ngFacebookInstance = new NgFacebook();
              return ngFacebookInstance;
            },
            function(error) {
              throw error;
            }
          );
        }
      }
    }
  ])

  /**
   * Facebook provider
   */
  .provider('Facebook', [
    function() {

      this.settings = {
        appId: null,
        locale: 'en_US',
        status: true,
        channelUrl: null,
        cookie: true,
        xfbml: true,
        authResponse: true,
        frictionlessRequests: false,
        hideFlashCallback: null,
        version: 'v2.0',
      };

      /**
       * Init Facebook API required stuff
       * This will prepare the app earlier (on settingsuration)
       * @arg {Object/String} initSettings
       */
      this.init = function(initSettings) {
        // If string is passed, set it as appId
        if (angular.isString(initSettings)) {
          this.settings.appId = initSettings || this.settings.appId;
        }

        // If object is passed, merge it with app settings
        if (angular.isObject(initSettings)) {
          angular.extend(this.settings, initSettings);
        }
      };

      this.$get = [
        'FacebookScriptLoader', (function(_this) {
          return function(loader) {
            return loader.load(_this.settings);
          };
        })(this)
      ];

      return this;
    }
  ]);

})(window, angular);
