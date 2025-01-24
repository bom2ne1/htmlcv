// var gg = []

const grouped = gg.reduce((acc, obj) => {
    if (!acc[obj.ip]) {
        acc[obj.ip] = [];
    }
    acc[obj.ip].push(obj);
    return acc;
}, {});

const filteredGrouped = Object.keys(grouped).reduce((acc, ip) => {
    const hasValidType = grouped[ip].some(obj => obj.type === 'scroll' || obj.type === 'click');

    if (hasValidType) {
        acc[ip] = grouped[ip];
    }

    return acc;
}, {});

const result = Object.keys(filteredGrouped).reduce((acc, ip) => {

    const sortedGroup = filteredGrouped[ip].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

    const firstTimestamp = Date.parse(sortedGroup[0].timestamp);
    const lastTimestamp = Date.parse(sortedGroup[sortedGroup.length - 1].timestamp);
    const totalTimeInMillis = lastTimestamp - firstTimestamp; 

    const totalTimeInSeconds = totalTimeInMillis / 1000; 

    const totalTimeInMinutes = totalTimeInSeconds / 60; 

    const pageLoadCount = sortedGroup.filter(obj => obj.type === 'page_load').length;

    acc[ip] = {
        items: sortedGroup,
        totalSec: totalTimeInSeconds,
        totalMin: totalTimeInMinutes.toFixed(2), 
        pageLoadCount
    };

    return acc;
}, {});

const sortByMostRecent = (result) => {
    return Object.entries(result).sort(([, a], [, b]) => {
        const latestTimestampA = Date.parse(a.items[a.items.length - 1].timestamp);
        const latestTimestampB = Date.parse(b.items[b.items.length - 1].timestamp);
        return latestTimestampB - latestTimestampA; 
    });
};

const sortByMostTimeSpent = (result) => {
    return Object.entries(result).sort(([, a], [, b]) => b.totalSec - a.totalSec); 
};

const sortByMostInteractions = (result) => {
    return Object.entries(result).sort(([, a], [, b]) => b.items.length - a.items.length); 
};

const sortByPageLoadCount = (result) => {
    return Object.entries(result).sort(([, a], [, b]) => b.pageLoadCount - a.pageLoadCount); 
};

var finalResult = {
    Recent: sortByMostRecent(result),
    TimeSpent: sortByMostTimeSpent(result),
    Interactions: sortByMostInteractions(result),
    Visits: sortByPageLoadCount(result)
}

console.log(finalResult)