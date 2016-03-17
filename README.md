# Singapore Taxi Data Collector and Viewer
Unofficial SDK of taxi locations in Singapore.

Implemented through the unpublished API of Taxi-Taxi@SG mobile apps.

We are not associated to Land Transport Authority of Singapore (LTA).

This repository contains 2 main components:

  1. _Server-side_ component as AWS-lambda functions that does the following:
    - Parsing and deofuscation of original Taxi-Taxi@SG mobile app API.
    - Serving of deofcustaed API directly to client.
    - Collecting of data onto AWS DymamoDB.
    - Other helpful server-side scripts.

  1. _Client-side_ component as a single-page app
    - This effective serves as a main working directory before its content is being mirrored to `gh-pages/` branch to be served.

## Why do we even need server-side scripts

  1. Original API does not have cross-origin resource sharing (CORS) enabled.
  1. Original API is strongly ofuscated. Significant amount of processing needed to deofcuscate: unzip, bit manipulation and string manipulation.

