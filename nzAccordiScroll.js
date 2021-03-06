(function() {

    var module = angular.module('nzAccordiScroll', []);

    module.directive('nzAccordiScroll', ['$timeout', function($timeout) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: {
                showStacks: '=',
                collapseSize: '='
            },
            replace: true,
            template: [
                '<div class="nzAccordiScroll"><div class="nzAccordiScroll-content" ng-transclude></div></div>'
            ].join(' '),
            controller: function($scope) {

                var root = this;
                $scope.root = root;

                root.init = function() {
                    root.states = [];
                    root.stacks = [];
                    root.stackElements = [];
                    root.topBreaks = [];
                    root.bottomBreaks = [];
                    root.topActive = [];
                    root.bottomActive = [];
                    root.topBreaks = [];
                    root.bottomBreaks = [];
                    root.toppedOut = 0;
                    root.bottomedOut = 0;

                    root.collapseSize = $scope.collapseSize || 2;

                    if (typeof $scope.showStacks != 'undefined') {
                        root.hasMaxTop = true;
                        root.hasMaxBottom = true;
                        if (typeof $scope.showStacks == 'object') {
                            root.maxTop = $scope.showStacks[0];
                            root.maxBottom = $scope.showStacks[1] + 2;
                        } else if (typeof $scope.showStacks == 'number') {
                            root.maxTop = $scope.showStacks;
                            root.maxBottom = $scope.showStacks + 2;
                        }
                        if (typeof root.maxTop != 'undefined' &&
                            root.maxTop < 1) {
                            root.maxTop = 1;
                        }

                        if (typeof root.maxBottom != 'undefined' &&
                            root.maxBottom < 3) {
                            root.maxBottom = 3;
                        }
                    }
                };

                var debounce;

                root.build = function(container) {
                    if (debounce) {
                        $timeout.cancel(debounce);
                    }
                    debounce = $timeout(function() {
                        root.init();
                        angular.forEach(container.find('.stack.original'), function(stack, index) {

                            if (angular.element(stack).scope().init) {
                                angular.element(stack).scope().init(index);
                            }
                        });
                        $timeout.cancel(debounce);
                    }, 100);
                };


                root.register = function(index, el) {
                    root.stacks[index] = el.outerHeight() - 1;
                    root.states[index] = 3;
                    root.stackElements[index] = el;
                    if (!root.hasMaxTop) {
                        root.maxTop = root.stacks.length;
                    }
                    if (!root.hasMaxBottom) {
                        root.maxBottom = root.stacks.length;
                    }
                    calculateBreaks();
                };

                function calculateBreaks() {
                    root.topBreaks = [];
                    root.bottomBreaks = [];
                    for (var i = 0; i < root.stacks.length; i++) {
                        var topBreak = 0;
                        var start = i - root.maxTop >= 0 ? i - root.maxTop : 0;
                        for (var b = 0; b < root.stacks.length; b++) {
                            if (b > start && b <= i) {
                                topBreak += root.stacks[b];
                            }
                        }
                        var bottomBreak = 0;
                        var end = i + root.maxBottom <= root.stacks.length ? i + root.maxBottom : root.stacks.length;
                        for (var c = 0; c < root.stacks.length; c++) {
                            if (c > i && c <= end) {
                                bottomBreak += root.stacks[c];
                            }
                        }
                        root.topBreaks[i] = topBreak;
                        root.bottomBreaks[i] = bottomBreak;
                    }
                }

                root.init();
            },
            link: function($scope, el, attrs) {

                el.css({
                    position: 'relative',
                    overflow: 'hidden',
                });
                var content = el.find('.nzAccordiScroll-content').css({
                    overflowY: 'scroll',
                    overflowX: 'hidden',
                    height: '100%',
                    width: '100%',
                    zIndex: 100 - 1,
                    WebkitOverflowScrolling: 'touch',
                    paddingRight: '25px',
                    boxSizing: 'content-box',
                });

                content.bind('touchmove', drag);
                content.bind('mousedown', function() {
                    window.addEventListener('mousemove', drag);
                    window.addEventListener('mouseup', function(e) {
                        drag(e);
                        window.removeEventListener('mousemove', drag);
                    });
                });

                function drag(e) {
                    if (content[0].scrollLeft > 0) {
                        content[0].scrollLeft = 0;
                    }
                }

            }
        };
    }]);

    module.directive('stack', ['$timeout', function($timeout) {
        return {
            restrict: 'EA',
            transclude: true,
            scope: true,
            replace: true,
            require: '^nzAccordiScroll',
            template: [
                '<div class="stack" ng-transclude ng-click="go()"></div>'
            ].join(' '),
            link: function($scope, el, attrs, root) {

                var container = el.closest('.nzAccordiScroll');
                var content = el.closest('.nzAccordiScroll-content');
                var clone = el.clone().addClass('clone').appendTo(container);
                el.addClass('original');

                var index;
                var scrollTop;
                var scrollBottom;
                var containerTop;
                var elementTop;
                var elementRelativeTop;
                var elementRelativeBottom;
                var previousHeight;
                var previousBreak;
                var nextHeight;
                var nextBreak;

                clone.click(go);
                angular.element(window).bind('scroll', update);
                content.bind('scroll', update);
                el.on('$destroy', function() {
                    $timeout(function() {
                        clone.remove();
                        root.build(container);
                    }, 100);
                });

                $scope.init = function(i) {

                    index = i;

                    el.css({
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all .1s linear',
                        userSelect: 'none',
                        overflow: 'hidden',
                    });


                    clone.css({
                        cursor: 'pointer',
                        position: 'absolute',
                        transition: 'all .1s linear',
                        width: '100%',
                        userSelect: 'none',
                        display: 'none',
                        bottom: '0',
                        overflow: 'hidden',
                    });

                    scrollTop = container.scrollTop();
                    scrollBottom = scrollTop + container.innerHeight();
                    containerTop = container[0].offsetTop;
                    elementTop = el[0].offsetTop;
                    elementRelativeTop = elementTop - containerTop;
                    elementRelativeBottom = elementRelativeTop + el.outerHeight();

                    root.register(index, el);


                    if (root.preScroll) {
                        $timeout.cancel(root.preScroll);
                    }
                    root.preScroll = $timeout(function() {
                        content.animate({
                            scrollTop: content[0].scrollHeight > 800 ? 800 : content[0].scrollHeight
                        }, 0);
                        content.animate({
                            scrollTop: 0
                        }, 800);
                    }, 400);

                    $scope.go = go;

                    update();

                };

                root.build(container);

                function go() {
                    content.animate({
                        scrollTop: elementRelativeTop - previousBreak
                    }, 800);
                }




                function update() {

                    root.toppedOut = 0;
                    root.bottomedOut = 0;
                    for (var i = root.states.length - 1; i >= 0; i--) {
                        if (root.states[i] == 1) {
                            root.toppedOut++;
                        }
                        if (root.states[i] == 5) {
                            root.bottomedOut++;
                        }
                    }

                    scrollTop = content.scrollTop();
                    scrollBottom = scrollTop + content.innerHeight();
                    contentTop = content[0].offsetTop;
                    elementTop = el[0].offsetTop;
                    elementRelativeTop = elementTop - contentTop;
                    elementRelativeBottom = elementRelativeTop + el.outerHeight();
                    previousBreak = root.topBreaks[index - root.toppedOut] ? root.topBreaks[index - root.toppedOut] : 0;
                    nextBreak = root.bottomBreaks[index + root.bottomedOut] ? root.bottomBreaks[index + root.bottomedOut] : 0;

                    if (!previousHeight) {
                        previousHeight = root.stackElements[index - 1] ? root.stackElements[index - 1].outerHeight() : 0;
                    }
                    if (!nextHeight) {
                        nextHeight = root.stackElements[index + 1] ? root.stackElements[index + 1].outerHeight() : 0;
                    }

                    var state = root.states[index];
                    var pastTop = scrollTop + previousBreak + previousHeight > elementRelativeTop;
                    var pastPreviousBreak = scrollTop + previousBreak + root.toppedOut * root.collapseSize + (index > root.maxTop ? el.outerHeight() : 0) > elementRelativeTop;
                    var pastNextBreak = scrollBottom - nextBreak - root.bottomedOut * root.collapseSize - ((root.stacks.length - 1 - index) > root.maxBottom ? el.outerHeight() : 0) < elementRelativeBottom;
                    var pastBottom = scrollBottom - nextBreak - nextHeight < elementRelativeBottom;

                    // Determine State

                    clone.html(el.html());

                    if (pastPreviousBreak) {

                        // if should be hidden
                        if (root.states[index + 1 + root.maxTop] < 3) {

                            if (root.states[index] > 1) {
                                root.states[index] = 1;
                                root.toppedOut++;
                            }

                            clone.css({
                                display: 'block',
                                top: index * root.collapseSize + 'px',
                                bottom: 'initial',
                                zIndex: 100 - (index - root.stacks.length)
                            });

                            return;
                        } else {

                            // remove from hidden
                            if (root.states[index] == 1) {
                                root.states[index] = 2;
                                root.toppedOut--;
                            }

                            // make sticky
                            if (root.states[index] > 2) {
                                root.states[index] = 2;
                            }

                            clone.css({
                                display: 'block',
                                top: previousBreak + root.toppedOut * root.collapseSize + 'px',
                                bottom: 'initial',
                                zIndex: 100 - (index - root.stacks.length)
                            });

                            return;
                        }
                    } else if (pastNextBreak) {

                        // if should be hidden
                        if (root.states[index + 1 - root.maxBottom] > 3) {

                            if (root.states[index] < 5) {
                                root.states[index] = 5;
                                root.bottomedOut++;
                            }

                            clone.css({
                                display: 'block',
                                bottom: (root.stacks.length - 1 - index) * root.collapseSize + 'px',
                                top: 'initial',
                                zIndex: 100 + index
                            });

                            return;
                        } else {

                            // remove from hidden
                            if (root.states[index] == 5) {
                                root.states[index] = 4;
                                root.bottomedOut--;
                            }

                            // make sticky
                            if (root.states[index] < 4) {
                                root.states[index] = 4;
                            }

                            clone.css({
                                display: 'block',
                                bottom: nextBreak + (root.bottomedOut * root.collapseSize) + 'px',
                                top: 'initial',
                                zIndex: 100
                            });

                            return;
                        }

                    } else {

                        root.states[index] = 3;

                        clone.css({
                            top: 'initial',
                            bottom: (root.stacks.length - index) * root.collapseSize + 'px',
                            zIndex: 100 - (index - root.stacks.length),
                            display: 'none'
                        });

                        return;
                    }

                }
            },
        };
    }]);

})();
