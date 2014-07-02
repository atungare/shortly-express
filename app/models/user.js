var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
// var Link = require('./link.js');

var User = db.Model.extend({
  tableName: 'users',
  links: function() {
    return this.belongsToMany(require('./link.js'), 'users_links');
  },
  initialize: function() {
    this.on('creating', this.hashPassword.bind(this));
  },
  validatePassword: function(password, callback) {
    bcrypt.compare(password, this.get('password'), function(err, result) {
      if(err) {
        throw err;
      }
      callback(result);
    });
  },
  hashPassword: function() {
    var hash = Promise.promisify(bcrypt.hash);

    return hash(this.get('password'), null, null)
      .bind(this)
      .then(function(result){
        this.set('password', result);
      })
      .catch(function(err) {
        throw err;
      });
  }
});

module.exports = User;
