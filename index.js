const parallelLimit = require('async').parallelLimit;
const request = require('request');
const fs = require('fs');


const outcodeReqs = [...Array(2950)]
    .map((_, code) => {
        return `http://api.rightmove.co.uk/api/sale/find?index=0&sortType=2&numberOfPropertiesRequested=1&locationIdentifier=OUTCODE%5E${code + 1}&apiApplication=IPAD`
    });

const reqFunctions = outcodeReqs
    .map((req, index) => {
        return function (handler) {
            console.log(`Got area ${index + 1}`);
            request(req, function (err, res, body) {
                if (err) return handler(null, { error: err });
                let data;
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    return handler(null, { error: e });
                }
                if (data.result !== 'SUCCESS') {
                    return handler(null, { error: data });
                } else {
                    return handler(null, data);
                }
            });
        }
    });

parallelLimit(reqFunctions, 5, function done(err, res) {
    if (err) console.error(err, res.filter(data => data.error));
    res = res
        .filter(data => data)
        .filter(data => !data.error);
    const outcodeData = res
        .map(data => {
            return {
                code: Number(data.searchableLocation.identifier.split('^')[1]),
                outcode: data.searchableLocation.name
            };
        });
    const allData = res.map(data => {
        delete data.properties;
        delete data.featuredProperties;
        delete data.usesPropertySearchApp;
        delete data.transactionTypeId;
        delete data.isFeaturedAgentSwitchOn;
        delete data.numReturnedResults;
        delete data.cacheTimeout;
        delete data.localHomepages;
        return data;
    });
    if (outcodeData.length) {
        fs.writeFileSync('./outcodeData.json', JSON.stringify(outcodeData), 'utf8');
    }
    if (allData.length) {
        fs.writeFileSync('./allData.json', JSON.stringify(allData), 'utf8');
    }
});
