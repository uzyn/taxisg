# Singapore Taxi Data Collector and Viewer
Unofficial SDK of available taxi locations in Singapore.

Implemented through the unpublished API of Taxi-Taxi@SG mobile apps.

We are not associated to Land Transport Authority of Singapore (LTA).

Presentation deck: [Uncovering of an obfuscated public API](https://speakerdeck.com/uzyn/uncovering-of-an-obfuscated-public-governmental-api-foss-asia-2016)

This repository contains 2 main components:

  1. Server-side component (`lambda/`) as AWS Lambda functions that does the following:
    - Parsing and deofuscation of original Taxi-Taxi@SG mobile app API.
    - Serving of deofcustaed API directly to client.
    - Collecting of data onto AWS DymamoDB.
    - Other helpful server-side scripts.

  1. Client-side component (`viewer/`) as a single-page app
    - This effective serves as a main working directory before its content is being mirrored to `gh-pages/` branch to be served.

## Why do we even need server-side scripts

  1. Original API does not have cross-origin resource sharing (CORS) enabled.
  1. Original API is strongly ofuscated. Significant amount of processing needed to deofcuscate: unzip, bit manipulation and string manipulation.


