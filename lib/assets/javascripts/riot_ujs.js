;(function(document, window) {

  var mounted_tags = [];

  mount = function() {
    tags = riot.mount('[riot-tag]');
    Array.prototype.push.apply(mounted_tags, tags);
  }

  unmount = function() {
    for (var i = 0; i < mounted_tags.length; ++i) {
      mounted_tags[i].unmount(true);
    }
    mounted_tags = [];
  }

  if (typeof Turbolinks !== 'undefined' && Turbolinks.supported) {
    document.addEventListener(Turbolinks.EVENTS.CHANGE, mount);
    document.addEventListener(Turbolinks.EVENTS.BEFORE_UNLOAD, unmount);
  } else {
    document.addEventListener('DOMContentLoaded', mount);
    document.addEventListener('unload', unmount);
  }

})(document, window);
