#!/usr/bin/env node

var express = require('express');
var http = require('http');
var path = require('path');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var TwitterUser = require('./twitteruser');
var config = require('./config');
var httpreq = require('httpreq');
var diffbot = require('./diffbot');
var textalytics = require('./textalytics');
var mongojs = require('mongojs');
var db = mongojs('expertextractor');
var client = db.client;
var MongoStore = require('connect-mongo')(express);
var users = db.collection('users');

var app = express();
var store = new MongoStore({db: client});
app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('tiny'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('expertextractor87907709'));
	app.use(express.session({cookie:{maxAge: 31536000000}, store: store}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(require('stylus').middleware(__dirname + '/public'));
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

passport.serializeUser(function (user, done) {
	done(null, user._id);
});

passport.deserializeUser(function (id, done) {
	users.findOne({_id: id},done);
});

passport.use(new TwitterStrategy({
		consumerKey: config.twitter.consumerKey,
		consumerSecret: config.twitter.consumerSecret,
	},
	function (token, tokenSecret, profile, done) {
		// console.log(token);
		// console.log(tokenSecret);
		// console.log(profile);

		// normaal dit opslaan db enzo:
		var user = {
			token       : token,
			tokenSecret : tokenSecret,
			id          : profile.id,
			_id         : profile.id,
			username    : profile.username,
			displayName : profile.displayName
		};
		users.save(user, function(err, maybeuser){
			done(err, user);
		});

	}
));

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) return next();
	return res.redirect('/login');
}


// ROUTES:

// Go here to log in with Twitter:
app.get('/auth/twitter', passport.authenticate('twitter', {callbackURL: "/auth/twitter/callback"}));

// Twitter comes back to this url:
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', {
		successRedirect: '/',
		failureRedirect: '/login'})
);

// aparte pagina met login button:
app.get('/login', function (req, res){
	res.render('login', { title: 'ExpertEx | Login' });
});

app.get('/', ensureAuthenticated, function (req, res){
	res.render('index', { title: 'ExpertEx | Search Expert by topic' });
});


// REST:
app.get('/api/searchtopic', ensureAuthenticated, function (req, res){
	var topic = req.query.topic;

	searchTopic(req.user, topic, function (err, experts){
		if(err) return sendError(err, res);

		res.json(experts);
	});
});

// generate tags using opencalais on Joachim's backend
app.post('/api/generatetags', ensureAuthenticated, function(req, res){
	var searchstring = req.body;
	httpreq.post('http://streamstore.test.iminds.be/tagger', {body: req.body.text}, function(err, tags){
		if(err) return sendError(err, res);
		res.send(tags.body);
	})

});

// test endpoint for diffbot
app.get('/testdiffbot', ensureAuthenticated, function(req, res){
	var url = req.query.url;
	diffbot.parseUrl(url, function(err, data){
		if(err) return sendError(err, res);
		res.json(data);
	});
});


app.get('/api/gettimelinetext', ensureAuthenticated, function (req, res){
	var screen_name = req.query.screen_name;

	var twitteruser = new TwitterUser({token: req.user.token, tokenSecret: req.user.tokenSecret});
	twitteruser.getTimelineText(screen_name, function (err, text){
		if(err) return sendError(err, res);

		res.send(text);
	});
});

function searchTopic(user, topic, callback){
	// meteen eens zoeken op een topic:
	var twitteruser = new TwitterUser({token: user.token, tokenSecret: user.tokenSecret});
	twitteruser.getUsersWhosTweetsAreRetweetedUsingTopic(topic, function (err, users){
		if(err) return callback(err);


		//return callback(null, users);

		// searching experts for all their tweets about this topic:
		async.forEach(users, function (user, $){
			// also add retweetedtweets to tweets:
			user.tweets = _.clone(user.retweetedtweets);

			twitteruser.searchTopicFromUser(topic, user.screen_name, function (err, tweets){
				if(err) return $(err);
				// add regular tweets of expert to him:

				for (var i = 0; i < tweets.length; i++) {

					var foundTweet = _.find(user.tweets, function (t){
						return t.id == tweets[i].id;
					});

					if(!foundTweet){
						user.tweets.push( tweets[i] );
					}
				}

				// topics voor die user extracten:
				twitteruser.getTimelineText(user.screen_name, function (err, text){
					if(err) return callback(err);

					textalytics.getTopicsOnText(text, function (err, topics){
						if(!err){
							user.topics = topics;
						}
						$();
					});
				});

			});
		}, function (err){
			if(err) return callback(err);


			// score berekenen:
			for (var i = users.length - 1; i >= 0; i--) {
				users[i].score = 0;
				users[i].score += config.algorithm.retweetsForTopicScore * users[i].retweetedtweets.length;
				users[i].score += config.algorithm.tweetAboutTopicScore  * users[i].tweets.length;
			};

			callback(null, users);
		});
	});
}

/**
 * Handig om meteen errors naar de client te sturen en ook te loggen
 */
function sendError(err, webresponse){
	var o = {
		err: err.toString()
	};
	console.log(err);

	if(err.stack){
		console.log(err.stack);
		o.errstack = err.stack;
	}

	webresponse.json(o);
}

