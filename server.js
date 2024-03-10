/*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            err.debug = "Debug";
            res.send(err);
        } else {
            user.comparePassword(userNew.password, function(isMatch) {
                if (isMatch) {
                    var userToken = { id: user.id, username: user.username };
                    var token = jwt.sign(userToken, process.env.SECRET_KEY);
                    res.json ({success: true, token: 'JWT ' + token});
                }
                else {
                    res.status(401).send({success: false, msg: 'Authentication failed.'});
                }
            })
        }


    })
});

app.get("/movies/:title?", authJwtController.isAuthenticated, (req, res) => {
    res = res.status(200);
    var o = getJSONObjectForMovieRequirement(req);
    if (req.get('Content-Type')) {
        res = res.type(req.get('Content-Type'));
    }
    console.log(req.params);
    if (req.params.title) {
        Movie.find({title: req.params.title}, function(err, movies) {
            if (err) {
                return res.send(err);
            }
            res.send(movies);
        });
    } else {
        Movie.find({}, function(err, movies) {
            if (err) {
                return res.send(err);
            }
            res.send(movies);
        });
    }
});

app.post("/movies/:title?", authJwtController.isAuthenticated, (req, res) => { //save movie
    res = res.status(200);
    var o = getJSONObjectForMovieRequirement(req);
    if (req.get('Content-Type')) {
        res = res.type(req.get('Content-Type'));
    }
    console.log(req.params);
    if (req.params.title) {
        o.body = {success: false, msg: 'Title query parameter invalid for POST'};
    } else {
        if (!req.body.title || !req.body.releaseDate || !req.body.genre || req.body.actors.length < 3) {
            o.body = {success: false, msg: 'Save failed, insufficient information.'};
        } else {
            var newMovie = new Movie();
            newMovie.title = req.body.title;
            newMovie.releaseDate = new Date(req.body.releaseDate);
            newMovie.genre = req.body.genre;
            newMovie.actors = req.body.actors;

            newMovie.save(function (err) {
                if (err) {
                    o.body = err;
                } else {
                    o.body = {success: true, msg: 'Successfully saved movie.'};
                }

            });
        }
    }
    res.json(o);
});

app.put("/movies/:title?", authJwtController.isAuthenticated, (req, res) => { //update movie
    res = res.status(200);
    var o = getJSONObjectForMovieRequirement(req);
    if (req.get('Content-Type')) {
        res = res.type(req.get('Content-Type'));
    }
    console.log(req.params);
    if (req.params.title) {
        Movie.findOne({ title: req.body.title }, function(err, movie) {
            if (err || !movie) {
                o.body = {success: false, msg: 'Movie not found'};
            } else {
                movie.title = req.body.title;
                movie.releaseDate = new Date(req.body.releaseDate);
                movie.genre = req.body.genre;
                movie.actors = req.body.actors;

                movie.save(function(err){
                    if (err) {
                        o.body = err;
                    } else {
                        o.body = {success: true, msg: 'Successfully updated movie.'};
                    }

                });
            }
        });
    } else {
        o.body = {success: false, msg: 'Title query parameter required for PUT'};
    }

    res.json(o);
});

app.delete("/movies/:title?", authJwtController.isAuthenticated, async (req, res) => { //delete movie
    console.log(req.body);
    res = res.status(200);
    var o = getJSONObjectForMovieRequirement(req);
    if (req.get('Content-Type')) {
        res = res.type(req.get('Content-Type'));
    }
    if (!req.params.title) {
        o.body = {success: false, msg: 'Title query parameter required for DELETE'}
    } else {
        var record = await Movie.deleteOne({title: req.params.title});
        console.log(record);
        if (record.deletedCount) {
            o.body = {success: true, msg: 'Movie deleted.'};
        } else {
            o.body = {success: false, msg: 'Movie not found.'};
        }
    }

    res.json(o);
})






app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


