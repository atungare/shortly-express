var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret:'secret'}));
  app.use(express.static(__dirname + '/public'));
});

app.all('*', function(req, res, next) {
  console.log("Request type: " + req.method + " from url: " + req.url);
  next();
});

app.get('/', util.checkUser, function(req, res) {
  res.render('index');
});

app.get('/create', util.checkUser, function(req, res) {
  res.render('index');
});

app.get('/links', util.checkUser, function(req, res) {
  Links.reset().query({where:{user_id:req.session.user.id}}).fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', util.checkUser, function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }
        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin,
        }).users().attach(req.session.user.id).then(function(pr) {
        // debugger;
          pr.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res){
  res.render('login');
});

app.post('/login', function(req, res){
  new User({username: req.body.username}).fetch().then(function(found) {
    if (found) {
      found.validatePassword(req.body.password, function(valid) {
        if (valid) {
          req.session.user = found;
          res.redirect('/');
        } else{
          res.redirect('/login');
        }
      });
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/signup', function(req, res){
  res.render('signup');
});

app.post('/signup', function(req, res){
  new User({ username: req.body.username }).fetch().then(function(found){
    if (found){
      res.redirect('/login');
    } else {
      // util.hashPassword(req.body.password, function(hash){
      //   new User({ username: req.body.username, password: hash })
      //   .save()
      //   .then(function(newUser) {
      //     req.session.user = newUser;
      //     res.redirect('/');
      //   });
      // });
      var user = new User({ username: req.body.username, password: req.body.password });
      user.save().then(function(newUser) {
        req.session.user = newUser;
        res.redirect('/');
      });
    }
  });
});

app.get('/logout', function(req, res){
  req.session.destroy(function(){
    res.redirect('/login');
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
