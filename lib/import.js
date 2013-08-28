// Generated by CoffeeScript 1.6.2
(function() {
  var ObjectID, async, connect, fs, importFixtures, insertItems, loadFixtures, mkdirp, outcome, path, readline, removeReferences, stepc, traverse, validate, _types;

  stepc = require("stepc");

  outcome = require("outcome");

  async = require("async");

  mkdirp = require("mkdirp");

  fs = require("fs");

  readline = require("readline");

  path = require("path");

  traverse = require("traverse");

  validate = require("./validate");

  connect = require("./connect");

  ObjectID = require("mongodb").ObjectID;

  _types = {
    ObjectID: ObjectID,
    Date: Date
  };

  /*
  */


  module.exports = function(options, next) {
    var o, rl;

    o = outcome.e(next);
    rl = readline.createInterface(process.stdin, process.stdout);
    return stepc.async((function() {
      return validate(options, this);
    }), o.s(function() {
      return connect(options, this);
    }), o.s(function(db) {
      this.db = db;
      return this();
    }), o.s(function() {
      return fs.readdir(options.path, this);
    }), o.s(function(collectionFiles) {
      collectionFiles = collectionFiles.filter(function(name) {
        return !/.DS_Store/.test(name);
      }).map(function(name) {
        return options.path + "/" + name;
      });
      return importFixtures(collectionFiles, this.db, this);
    }), next);
  };

  /*
  */


  importFixtures = function(fixturePaths, db, next) {
    var o;

    o = outcome.e(next);
    return stepc.async((function() {
      return loadFixtures(fixturePaths, this);
    }), o.s(function(items) {
      this.items = items;
      return removeReferences(db, items, this);
    }), o.s(function() {
      return insertItems(db, this.items, this);
    }), next);
  };

  loadFixtures = function(fixturePaths, next) {
    var items;

    items = [];
    return async.eachSeries(fixturePaths, (function(fixturePath, next) {
      items = items.concat(require(fixturePath));
      return next();
    }), outcome.e(next).s(function() {
      return next(null, items.map(function(item) {
        traverse(item).forEach(function(x) {
          if (x && x.__type) {
            return this.update(new _types[x.__type](x.value));
          }
        });
        return item;
      }));
    }));
  };

  removeReferences = function(db, items, next) {
    return async.eachSeries(items, function(item, next) {
      var collection, keys, refs;

      refs = [];
      for (collection in item.__refs) {
        keys = item.__refs[collection];
        refs.push.apply(refs, keys.map(function(key) {
          return {
            collection: collection,
            field: key
          };
        }));
      }
      return async.eachSeries(refs, (function(ref, next) {
        var search;

        search = {};
        search[ref.field] = item._id;
        console.log("remove %s:%s.%s", ref.collection, item._id, ref.field);
        return db.collection(ref.collection).remove(search, next);
      }), next);
    }, next);
  };

  /*
  */


  insertItems = function(db, items, next) {
    async.eachSeries(items, (function(item, next) {
      var collection;

      collection = item.__collection;
      delete item.__collection;
      delete item.__refs;
      if (/^system/.test(collection)) {
        return next();
      }
      console.log("insert %s:%s", collection, item._id);
      return db.collection(collection).insert(item, function(err) {
        if (err) {
          console.warn(err);
        }
        return next();
      });
    }), next);
    return function(fixturePath, next) {
      var collectionName, results;

      collectionName = path.basename(fixturePath).split(".").shift();
      console.log("importing %s", collectionName);
      results = require(fixturePath);
      return importItems(results, db, next);
    };
  };

}).call(this);