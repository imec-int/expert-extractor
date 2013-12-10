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
			if(data.err) return console.log(data.err);
			var experts = data;

			// debug:
			console.log(experts);

			// populate html:
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

	return {
		init: init
	};
};


$(function(){
	var app = new App({});
	app.init();
});




