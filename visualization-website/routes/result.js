var express = require('express');
var request = require('request');
var async = require('async');
var router = express.Router();

const config = require('../config.json');

/* GET result page. */
router.get('/', async function(req, res, next) {
  const id = req.query.id;
  var rlt = {
    title: "Recommendify"
  };

  async.waterfall([
    (callback) => {  // check if query params are missed
      if (!id) res.redirect('/');
      else callback(null);
    },
    async (callback) => {  // get recommendation result
      const recommends = await getRecommmend([id])
        .catch((err) => {
          console.log(err);
          res.redirect('/');
        });
      console.log('rrr', recommends);
      return recommends;
    },
    async (recommends, callback) => {  // get base song metadata
      const data = await getTrackData(req.protocol, req.get('host'), id)
        .catch((err) => {
          console.log(err);
          res.redirect('/');
        });
      
      console.log(data);
      
      rlt.base = {
        id: data.id,
        name: data.name,
        artist: data.artist,
        cover: data.cover
      };
      
      return recommends;
    },
    (recommends, callback) => {  // mapping recommended IDs into track metadatas
      const resultPromises = recommends.map(id => getTrackData(req.protocol, req.get('host'), id));

      Promise.all(resultPromises)
        .then(results => {
          rlt.results = results;
          res.render('result', rlt);
        })
        .catch(err => {
          console.log(err);
          res.redirect('/');
        });
    }
  ],
  (err) => {
    if (err) {
      console.log('err at 03');
      console.log(err);
      res.redirect('/');
    }
  });
});

/**
 * Find track metadata using Spotify ID
 * 
 * @param {String} protocol API protocol {http/https}
 * @param {String} host host url of server
 * @param {String} id Spotify ID to be searched
 * @returns metadata of the track
 */
function getTrackData(protocol, host, id) {
  return new Promise((resolve, reject) => {
    request.get({
      url: `${protocol}://${host}/s/getTrackFromID?id=${id}`
    }, (err, res, body) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        const data = JSON.parse(body).data;
        resolve(data);
      }
    });
  });
}

/**
 * Get recommendation using Spotify IDs
 * 
 * @param {Object} ids list of Spotify IDs as recommendation seed
 * @returns {Object} list of Spotify IDs being recommended
 */
function getRecommmend(ids) {
  return new Promise((resolve, reject) => {
    request.post({
      url: `${config.model_server}/recommend`,
      body: { id: ids },
      json: true
    }, (err, res, body) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        const data = body.data;
        resolve(data);
      }
    });
  });
}

module.exports = router;
