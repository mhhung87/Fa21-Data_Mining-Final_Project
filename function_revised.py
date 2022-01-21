import numpy as np
import pandas as pd
# from sklearn.cluster import KMeans
# from sklearn.preprocessing import StandardScaler
# from sklearn.pipeline import Pipeline
from scipy.spatial.distance import cdist
import requests
from requests.auth import HTTPBasicAuth


def find_song(id):

  client_id = "84faa55d569a4457a346bd6e450b3b78"
  client_secret = "61170a4aa136421c841c783b8ec541ef"

  res_api = requests.post(
      "https://accounts.spotify.com/api/token",
      data = {"grant_type": "client_credentials"},
      auth = HTTPBasicAuth(client_id, client_secret)
  )
  
  url_song_features = "https://api.spotify.com/v1/audio-features/"
  url_tracks = "https://api.spotify.com/v1/tracks/"

  if res_api.status_code == 200:
    token_object = res_api.json()
    token = token_object["access_token"]

  res_song_features = requests.get(
      url_song_features + id,
      headers = {"Authorization": "Bearer " + token}
  )

  res_tracks = requests.get(
      url_tracks + id,
      headers = {"Authorization": "Bearer " + token}
  )

  json_song_features = res_song_features.json()
  json_tracks = res_tracks.json()

  cols = ['danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness',
       'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'duration_ms']

  features = {}
  features.update(dict( ((key, json_song_features[key]) for key in cols) ))
  features["year"] = int(json_tracks["album"]["release_date"][:4])
  features["popularity"] = json_tracks["popularity"]
  features["name_track"] = json_tracks["name"]
  features["name_album"] = json_tracks["album"]["name"]
  # Artist might be multiple
  features["name_artist"] = json_tracks["artists"][0]['name']

  return pd.DataFrame(features, index=[0])

cols = ['danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness',
       'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'duration_ms',
       'year', 'popularity']

def collect_song(id, dataset):
    try:
        #print(song['name'], song['year'])
        data = dataset[dataset['id'] == id].iloc[0]
        #print('find in database')
        #print(data)
        return data
    except IndexError:
        data = find_song(id)
        #print(data)
        return data

def get_vector(song_lst, dataset):

    vectors = []

    for song in song_lst:
        data = collect_song(song, dataset=dataset)
        if data is None:
            print('{} is not found.'.format(data['name']))
            continue
        vectors.append(data[cols].values)
    tmp = np.mean(np.array(list(vectors)), axis=0)

    return pd.DataFrame(tmp, columns=cols)

def change_dict_list(dict_list):
    new = {}
    for key in dict_list[0].keys():
        new[key] = []
    
    for dictionary in dict_list:
        for key, value in dictionary.items():
            new[key].append(value)
            
    return new

# def fit_pipeline(dataset):
#     song_cluster_pipe = Pipeline([('sclaer', StandardScaler()), ('kmeans', KMeans())])

#     cols = ['danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness','acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'duration_ms', 'year', 'popularity']
#     X = dataset[cols]
#     song_cluster_pipe.fit(X)
#     return song_cluster_pipe

def minmax_transform(data, dataset):
    cols = ['danceability', 'energy', 'key', 'loudness', 'mode', 'speechiness','acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo', 'duration_ms', 'year', 'popularity']
    for column in data[cols].columns:
        data[column] = (data[column] - dataset[column].min()) / (dataset[column].max() - dataset[column].min())  
    return data[cols]

def recommend(song_lst, dataset, specific_year=None, number=10):
    require_data = ['name', 'year', 'artists', 'id']
    dataset = pd.read_csv(dataset)

    song_lst_mean = get_vector(song_lst, dataset=dataset)
    #pipe = fit_pipeline(dataset).steps[0][1]
    if specific_year != None:
        dataset = dataset[dataset['year'].isin(specific_year)]
        df = dataset[cols]
        data_transform = minmax_transform(df, df)
        # data_transform = dataset[cols]
    else:
        data_transform = minmax_transform(dataset[cols], dataset[cols])
    
    song_lst_mean = minmax_transform(song_lst_mean, dataset[cols])
    
    d = cdist(song_lst_mean, data_transform, 'cosine')
    i = list(np.argsort(d)[:, :number][0])
    
    results = dataset.iloc[i]
        
    return results[require_data].id.to_list()
    
def print_result(results):
    for i, result in enumerate(results):
        print('Top {} recommended song'.format(i+1))
        print('Track name: {}, year: {}, artist: {}'.format(result['name'], result['year'], result['artists']))
        