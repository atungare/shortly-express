var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link.js');

var User = db.Model.extend({
  tableName: 'users',
  links: function() {
    return this.hasMany(Link);
  },
  initialize: function() {
    this.on('creating', function(model, attr, options) {
      bcrypt.genSalt(10, function(err, salt) {
        if (err) {
          throw err;
        }
        bcrypt.hash(model.get('password'), salt, null, function(err, hash) {
          if (err){
            throw err;
          }
          debugger;
          model.set('password', hash);
        });
      });
    });
  },
  validatePassword: function(password, callback) {
    console.log('pw', this.get('password'));
    bcrypt.compare(password, this.get('password'), function(err, result) {
      if(err) {
        throw err;
      }
      callback(result);
    });
  }
});

module.exports = User;
