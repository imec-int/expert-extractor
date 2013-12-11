var App = function (options){

	var expertContainer = $("#topexpertlist>.row");

	var init = function (){

		// handlers:
		$("#searchbtn").click(onSeachExperts);
		$("#topicfield").keypress(function (event) {
			if(event.which == 13) return onSeachExperts(); //ON ENTER
		});

	};

	var onSeachExperts = function(){
		var topic = $("#topicfield").val();
		console.log("searchbtn clicked and searching for " + topic);

		$.get('/api/searchtopic', {topic: topic}, function (data){
			if(data.err){
				console.log(data.err)
				alert(data.err)
				return;
			}
			var experts = data;

			// debug:
			console.log(experts);

			// populate html:
			setTopic(topic);
			clearExperts();
			for (var i = 0; i < experts.length; i++) {
				addExpert( experts[i], topic );
			};
		});
	};

	var setTopic = function(topic){
		$("#topic").html(topic);
	};

	var clearExperts = function(){
		expertContainer.empty();
	};

	var addExpert = function(expert, topic){
		expert.topic = topic;
		expert.profile_image_url = expert.profile_image_url.replace(/_normal/, '');

		expert.earliestTweetDate = null;
		for (var i = expert.tweets.length - 1; i >= 0; i--) {
			if( !expert.earliestTweetDate || expert.tweets[i].created_at < expert.earliestTweetDate)
				expert.earliestTweetDate = expert.tweets[i].created_at;
		};
		expert.earliestTweetDate = getDateString(expert.earliestTweetDate); //omzetten in iets leesbaars

		expert.earliestRetweetedtweetDate = null;
		for (var i = expert.retweetedtweets.length - 1; i >= 0; i--) {
			if( !expert.earliestRetweetedtweetDate || expert.retweetedtweets[i].created_at < expert.earliestRetweetedtweetDate)
				expert.earliestRetweetedtweetDate = expert.retweetedtweets[i].created_at;
		};
		expert.earliestRetweetedtweetDate = getDateString(expert.earliestRetweetedtweetDate); //omzetten in iets leesbaars

		var html = $("#expert-tmpl").tmpl(expert);
		expertContainer.append(html);
	};

	var moreinfo = function(panel) {
		var hgt = $('.'+panel).height();
		console.log(hgt);
		$('#moreinfo').height(hgt);
		$("#topexpertlist .profilepanel:not('."+panel+"')").hide();
		$( "#moreinfo" ).appendTo( "#topexpertlist > row" );
		$('.'+panel).removeClass('')
	};

	var getDateString = function(epoch){
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

		var date = new Date(epoch);

		var datestring = date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();

		return datestring;
	};

	var onMarkasbadexpert = function(event){
		console.log(event);
		var userid = $(event.target).attr('data-userid');
		console.log(userid);
	};


	return {
		init: init
	};
};


$(function(){
	var app = new App({});
	app.init();
});




