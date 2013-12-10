var httpreq = require('httpreq');

function parseUrl(url, callback){
	httpreq.get("http://www.diffbot.com/api/article?token="+config.diffbot.token+"&tags=true&summary=true&url=" + encodeURIComponent(url), function (err, res){
			if(err) return callback(err);

			var item = null;
			try{
				item = JSON.parse(res.body);
			}catch(err){}

			if(!item){
				console.log("Diffbot error:");
				console.log(res.body);

				return callback(new Error("Diffbot error, see log"));
			}

			if(item.error) return callback(new Error(item.error));

			if(item.date){
				var date;
				date = dateParser1( item.date );

				if(!date)
					date = dateParser2( item.date );

				if(!date){
					console.log( "Diffbot: problem parsing date: " + item.date );
					date = (new Date()).getTime(); // huidige tijd er in steken
				}

				item.date = date;
			}else{
				item.date = (new Date()).getTime(); // huidige tijd er in steken
			}

			//set source:
			if(!item.source){
				var match = url.match(/http(s)?:\/\/(www.)?(.+?)\//);
				if(match && match[3]){
					item.source = match[3];
				}
			}

			callback(null, item);

		});
}


function dateParser1(dateString){
	// eerste formaat:
	// format: 7/25/12
	var match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{1,2})/);
	if(!match)
		return;

	var month = parseInt(match[1]);
	var day = parseInt(match[2]);
	var year = parseInt(match[3]);

	// beetje fancy javascript proberen :p
	month -= 1; // month starts at 0
	year = (year < 2000) ? year+2000 : year; //TODO: binnen 1000 jaar aanpassen naar 3000 :p

	var date = new Date(year, month, day, 0, 0, 0, 0);
	return date.getTime();
}

function dateParser2(dateString){
	// 2e formaat:
	// Thu, 17 May 2012 20:06:26 GMT
	var match = dateString.match(/^.+?,\s(\d.)\s(.+?)\s(\d{4})\s(\d{2}):(\d{2}):(\d{2})\sGMT$/);
	if(!match)
		return null;

	var day = parseInt(match[1]);
	var monthString = match[2];
	var year = parseInt(match[3]);
	var hour = parseInt(match[4]);
	var minutes = parseInt(match[5]);
	var seconds = parseInt(match[6]);
	var monthMap = {
		'Jan' : 0,
		'Feb' : 1,
		'Mar' : 2,
		'Apr' : 3,
		'May' : 4,
		'Jun' : 5,
		'Jul' : 6,
		'Aug' : 7,
		'Sep' : 8,
		'Oct' : 9,
		'Nov' : 10,
		'Dec' : 11
	};
	if(!monthMap[monthString])
		return console.log("Diffbot dateParser2: could not parse month " + monthString);

	var month = monthMap[monthString];
	var date = new Date(year, month, day, hour, minutes, seconds, 0);
	return date.getTime();
}

exports.parseUrl = parseUrl;



