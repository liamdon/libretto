// Generated by CoffeeScript 1.6.2
(function() {
  var async, attachRefs, attachRefs2, connect, exportCollection, exportCollections, fs, loadCollections, mapItemRelationships, mkdirp, mongodb, outcome, stepc, traverse, type, validate;

  stepc = require("stepc");

  outcome = require("outcome");

  async = require("async");

  mkdirp = require("mkdirp");

  fs = require("fs");

  type = require("type-component");

  traverse = require("traverse");

  validate = require("./validate");

  connect = require("./connect");

  mongodb = require("mongodb");

  /*
  */


  module.exports = function(options, next) {
    var o;

    o = outcome.e(next);
    return stepc.async((function() {
      return validate(options, this);
    }), o.s(function() {
      var e;

      try {
        mkdirp.sync(options.path);
      } catch (_error) {
        e = _error;
      }
      return this();
    }), o.s(function() {
      return connect(options, this);
    }), o.s(function(db) {
      this.db = db;
      return db.collectionNames(this);
    }), o.s(function(names) {
      var collections,
        _this = this;

      collections = names.map(function(data) {
        return _this.db.collection(data.name.split(".").slice(1).join("."));
      });
      return exportCollections(options, collections, this);
    }), next);
  };

  /*
  */


  exportCollections = function(options, collections, next) {
    return loadCollections(collections, function(err, collections) {
      mapItemRelationships(collections);
      return async.eachSeries(collections, exportCollection(options), next);
    });
  };

  /*
  */


  mapItemRelationships = function(collections) {
    var all, collection, item, key, _i, _j, _len, _len1, _ref, _results;

    console.log("mapping item relationships");
    all = {};
    for (_i = 0, _len = collections.length; _i < _len; _i++) {
      collection = collections[_i];
      _ref = collection.items;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        item = _ref[_j];
        item.__collection = collection.name;
        item.__refs = {};
        all[item._id] = item;
      }
    }
    _results = [];
    for (key in all) {
      item = all[key];
      _results.push(attachRefs(item, all));
    }
    return _results;
  };

  attachRefs = function(item, all) {
    var keys;

    keys = [];
    return traverse(item).forEach(function(x) {
      var key, p, r, ref, refs;

      keys = [];
      p = this;
      while (p) {
        if (isNaN(p.key) && p.key) {
          keys.unshift(p.key);
        }
        p = p.parent;
      }
      key = keys.join(".");
      if (ref = all[x]) {
        refs = ref.__refs;
        if (!(r = refs[item.__collection])) {
          r = refs[item.__collection] = [];
        }
        if (!~r.indexOf(key)) {
          r.push(key);
        }
      }
      if (x && typeof x === "object" && !/^(Array|Object)$/.test(x.constructor.name)) {
        this.update({
          __type: x.constructor.name,
          value: x
        });
        return this.block();
      }
    });
  };

  /*
  */


  attachRefs2 = function(item, all, current, keys) {
    var key, kp, r, ref, refs, sub, t, value, _i, _len;

    if (keys == null) {
      keys = [];
    }
    if (!current) {
      current = item;
    }
    for (key in current) {
      value = current[key];
      if ((ref = all[value])) {
        kp = keys.concat(key).join(".");
        refs = ref.__refs;
        if (!(r = refs[item.__collection])) {
          r = refs[item.__collection] = [];
        }
        if (!~r.indexOf(kp)) {
          r.push(kp);
        }
      } else if ((t = type(value)) === "array") {
        for (_i = 0, _len = value.length; _i < _len; _i++) {
          sub = value[_i];
          if (sub) {
            attachRefs(item, all, sub, keys.concat(key));
          }
        }
      } else if (t === "object" && value) {
        attachRefs(item, all, value, keys.concat());
      }
      if (value && (typeof value === "object") && !/^Array|Object$/.test(value.constructor.name)) {
        current[key] = {
          __type: value.constructor.name,
          value: value
        };
      }
    }
    return refs;
  };

  /*
  */


  loadCollections = function(collections, next) {
    var data;

    data = [];
    return async.eachSeries(collections, (function(collection, next) {
      return collection.find().toArray(function(err, result) {
        if (err != null) {
          return next(err);
        }
        console.log("loaded %s (%d)", collection.collectionName, result.length);
        data.push({
          name: collection.collectionName,
          items: result
        });
        return next();
      });
    }), function(err) {
      if (err != null) {
        return next(err);
      }
      return next(null, data);
    });
  };

  /*
  */


  exportCollection = function(options) {
    return function(collection, next) {
      var o, path;

      path = options.path + "/" + collection.name + ".json";
      console.log("exporting %s", collection.name);
      o = outcome.e(next);
      return stepc.async(o.s(function(results) {
        return fs.writeFile(path, JSON.stringify(collection.items, null, 2), this);
      }), next);
    };
  };

}).call(this);