var httpreq = require('httpreq');
var _ = require('underscore');
var config = require('./config');


function getTopicsOnText(text, callback){
	httpreq.post('https://textalytics.com/core/topics-1.1', {parameters:{
		tt: 'ec',
		dic: 'chetsdpCA',
		key: config.textalytics.key,
		of : 'json',
		lang: 'en',
		txt: text,
		txtf: 'plain'
	}}, function (err, res){
		if(err) return callback(err);

		var data = null;
		try{
			data = JSON.parse(res.body);
		}catch(err){
			return callback(err);
		}

		var topics = [];

		if( data.entity_list ){
			for (var i = 0; i < data.entity_list.length; i++) {
				var existingTopic = _.find(topics, function (t){ return t.topic == data.entity_list[i].form; });
				if(existingTopic){
					existingTopic.occurrence = existingTopic.occurrence + data.entity_list[i].variant_list.length;
				}else{
					var topic = {topic: data.entity_list[i].form, occurrence: data.entity_list[i].variant_list.length};
					topics.push(topic);
				}
			};
		}

		if( data.concept_list ){
			for (var i = 0; i < data.concept_list.length; i++) {
				var existingTopic = _.find(topics, function (t){ return t.topic == data.concept_list[i].form; });
				if(existingTopic){
					existingTopic.occurrence = existingTopic.occurrence + data.concept_list[i].variant_list.length;
				}else{
					var topic = {topic: data.concept_list[i].form, occurrence: data.concept_list[i].variant_list.length};
					topics.push(topic);
				}
			};
		}

		topics = _.sortBy(topics, function (t){
			return -t.occurrence;
		});

		callback(null, topics);
	});
}


exports.getTopicsOnText = getTopicsOnText;