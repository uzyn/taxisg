# taxisg
Unofficial SDK of taxi locations in Singapore.

Implemented through the unpublished API of Taxi-Taxi@SG mobile apps.

We are not associated to Land Transport Authority of Singapore (LTA).

## Why do we need a server

1. Original API does not have cross-origin resource sharing (CORS) enabled.
1. Original API is strongly ofuscated. Significant amount of processing needed to deofcuscate: unzip, bit manipulation and string manipulation.

