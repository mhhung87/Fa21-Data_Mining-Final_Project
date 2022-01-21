var express = require('express');
var request = require('request');
var async = require('async');
var router = express.Router();

const client_id = 'Spotify Client ID';
const client_secret = 'Spotify Client Secret';
var _api_token = '';
var _api_timestamp = 0;

/**
 * Get token from spotify
 * 
 * @returns {Promise<String>} Promise of token
 */
function getApiToken() {
  return new Promise((resolve, reject) => {
    async.waterfall([
      (callback) => {
        const cur = new Date();
        const diffMS = cur.getTime() - _api_timestamp;

        // timestamp is more than 30 min
        if (diffMS > 30 * 60 * 1000) {
          callback(null);
        } else resolve(_api_token);
      },
      (callback) => {
        request.post({
          url: 'https://accounts.spotify.com/api/token',
          form: {
            grant_type: "client_credentials"
          },
          auth: {
            user: client_id,
            pass: client_secret
          }
        }, (err, res, body) => {
          if (err) reject(err);

          const data = JSON.parse(body);
          const token = data.access_token;

          callback(null, token);
        });
      }
    ], (err, result) => {
      if (err) reject(err);
      const cur = new Date();
      _api_timestamp = cur.getTime();
      _api_token = result;
      resolve(result);
    });
  });
}

/**
 * Search the song on Spotify and return song details and ID
 * 
 * @param {String} song Name of the song
 * @param {Number} year Year of the song
 * @returns {Promise<Object>} Promise which returns result object
 */
function searchSong(song, year) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      async (callback) => {
        const token = await getApiToken().catch((err) => { reject(err); });
        return token;
      },
      (token, callback) => {
        request.get({
          url: encodeURI(`https://api.spotify.com/v1/search?q=track:${song}+year:${year}&type=track`),
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }, (err, res, body) => {
          if (err) reject(err);

          const data = JSON.parse(body);
          try {
            const item = data.tracks.items[0];
            const rlt = {
              id: item.id,
              artists: item.artists.map(x => x.name).join(',  '),
              track: item.name
            };
            resolve(rlt);
          } catch (error) {
            reject(error);
          }
        });
      }
    ],
    (err) => {
      if (err) reject(err);
    });
  });
}

/**
 * Convert ms to 3:20
 * 
 * @param {Number} ms Time length in ms
 * @returns Time length consisted of minutes and seconds e.g. 3:20
 */
function convertMS(ms) {
  var seconds = (ms/1000) % 60;
  seconds = parseInt(seconds);
  var minutes = (ms / (1000 * 60)) % 60;
  minutes = parseInt(minutes);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get spotify track ID from input and redirect to result page
 */
router.post('/search', function (req, res, next) {
  const name = req.body.name;
  const year = req.body.year;

  async.waterfall(
    [
      (callback) => {
        if (req.body.name) callback(null);
        else res.json({
            status: false,
            error: 'lacking parameters'
          });
      },
      async (callback) => {
        const trackData = await searchSong(name, year).catch((err) => {
          res.json({
            status: false,
            error: err
          });
        });

        return trackData;
      },
      (data, callback) => {
        res.json({
          status: true,
          data: data
        });
      }
    ],
    (err) => {
      if (err) res.json({
        status: false,
        err: "Search song error"
      });
    }
  );
});


/**
 * Get track data by Spotify ID
 */
router.get('/getTrackFromID', function (req, res, next) {
  const id = req.query.id;
  console.log(req.query);

  async.waterfall([
    (callback) => {
      if (id) callback(null);
      else res.json({
        status: false,
        error: 'lacking parameters'
      });
    },
    async (callback) => {
      const token = await getApiToken().catch((err) => { reject(err); });
      return token;
    },
    (token, callback) => {
      request.get({
        url: `https://api.spotify.com/v1/tracks/${id}`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (err, response, body) => {
        if (err) res.json({
          status: false,
          err: "Get track data error"
        });

        const data = JSON.parse(body);

        try {
          const rlt = {
            id: id,
            name: data.name,
            artist: data.artists.map(x => x.name).join(',  '),
            album: data.album.name,
            cover: data.album.images[1].url,
            duration: convertMS(data.duration_ms)
          };

          res.json({
            status: true,
            data: rlt
          });
        } catch (error) {
          console.log(error);
          res.json({
            status: false,
            err: "Parse track data error"
          });
        }
      });
    }
  ],
  (err) => {
    if (err) res.json({
      status: false,
      err: "Get track data error"
    });
  });
});

module.exports = router;
