﻿var hoverZoomPlugins = hoverZoomPlugins || [];
hoverZoomPlugins.push( {
    name: 'dailymotion_a',
    version: '1.1',
    prepareImgLinks: function(callback) {
        var name = this.name;

        // if header(s) rewrite is allowed store settings defined above
        if (options.allowHeadersRewrite) {
            chrome.runtime.sendMessage({action:"storeHeaderSettings",
                                        requestOrResponse:"request",
                                        skipInitiator:"dailymotion",
                                        url:"dailymotion.com",
                                        headers:[{name:"referer", value:"https://www.dailymotion.com/", typeOfUpdate:"add"}]});
            chrome.runtime.sendMessage({action:"storeHeaderSettings",
                                        requestOrResponse:"response",
                                        skipInitiator:"dailymotion",
                                        url:"dailymotion.com",
                                        headers:[{name:"Access-Control-Allow-Origin", value:"*", typeOfUpdate:"add"}]});
        }

        // users
        // sample: https://www.dailymotion.com/CanalplusSport
        $('a[href]').filter(function() { return (/dailymotion\.com\/[^\/]{1,}$/.test($(this).prop('href'))) }).on('mouseover', function() {
            var link = undefined;
            var href = undefined;

            href = this.href;
            link = $(this);

            const re = /dailymotion\.com\/([^\/\?]{1,})$/;   // user (e.g. CanalplusSport)
            m = href.match(re);
            if (m == undefined) return;
            let user = m[1];

            // reuse previous result
            if (link.data().hoverZoomDailyMotionUser == user) {
                if (link.data().hoverZoomDailyMotionUserUrl) link.data().hoverZoomSrc = [link.data().hoverZoomDailyMotionUserUrl];
                return;
            }

            link.data().hoverZoomDailyMotionUser = user;
            link.data().hoverZoomDailyMotionUserUrl = undefined;

            // clean previous result
            link.data().hoverZoomSrc = [];
            getUserFromAPI(user, link);
        })

        function getUserFromAPI(user, link) {
            chrome.runtime.sendMessage({action:'ajaxRequest',
                                        method:'GET',
                                        url:'https://api.dailymotion.com/user/' + user + '?fields=avatar_720_url',
                                        headers:[{"header":"Content-Type","value":"application/json"}]},
                                        function (response) {
                                            if (response) {
                                                try {
                                                    let j = JSON.parse(response);
                                                    let userUrl = j.avatar_720_url;
                                                    if (userUrl) {
                                                        link.data().hoverZoomDailyMotionUserUrl = userUrl;
                                                        link.data().hoverZoomSrc = [userUrl];
                                                        callback(link, name);
                                                        hoverZoom.displayPicFromElement(link);
                                                    }
                                                } catch {}
                                            }
                                        });
        }

        // playlists
        // sample: https://www.dailymotion.com/playlist/x7292h
        $('a[href*="/playlist/"]').filter(function() { return (/dailymotion\.com\/playlist\//.test($(this).prop('href'))) }).on('mouseover', function() {
            var link = undefined;
            var href = undefined;

            href = this.href;
            link = $(this);

            const re = /dailymotion\.com\/playlist\/([^\/\?]{1,})/;   // playlist id (e.g. x7292h)
            m = href.match(re);
            if (m == undefined) return;
            let playlistId = m[1];

            // reuse previous result
            if (link.data().hoverZoomDailyMotionPlaylistId == playlistId) {
                if (link.data().hoverZoomDailyMotionPlaylistUrls) link.data().hoverZoomGallerySrc = link.data().hoverZoomDailyMotionPlaylistUrls;
                return;
            }

            link.data().hoverZoomDailyMotionPlaylistId = playlistId;
            link.data().hoverZoomDailyMotionPlaylistUrls = [];

            // clean previous result
            link.data().hoverZoomSrc = [];
            getPlaylistFromAPI(playlistId, link);
        })

        function getPlaylistFromAPI(playlistId, link) {
            chrome.runtime.sendMessage({action:'ajaxRequest',
                                        method:'GET',
                                        url:'https://api.dailymotion.com/playlist/' + playlistId + '/videos?limit=100',
                                        headers:[{"header":"Content-Type","value":"application/json"}]},
                                        function (response) {
                                            try {
                                                let j = JSON.parse(response);
                                                let nb = j.list.length;
                                                for (let i = 0; i < nb; i++) {
                                                    let videoId = j.list[i].id;
                                                    getVideosFromAPI(videoId, link, nb, i);
                                                }
                                            } catch {}
                                        });
        }

        // videos
        // sample: https://www.dailymotion.com/video/x8994nm
        $('a[href*="/video/"]').filter(function() { return (/dailymotion\.com(\/embed)?\/video\//.test($(this).prop('href'))) }).on('mouseover', function() {
            var link = undefined;
            var href = undefined;

            href = this.href;
            link = $(this);

            const re = /dailymotion\.com(?:\/embed)?\/video\/([^\/\?]{1,})/;   // video id (e.g. x8994nm)
            m = href.match(re);
            if (m == undefined) return;
            let videoId = m[1];

            // reuse previous result
            if (link.data().hoverZoomDailyMotionVideoId == videoId) {
                if (link.data().hoverZoomDailyMotionVideoUrl) link.data().hoverZoomSrc = [link.data().hoverZoomDailyMotionVideoUrl];
                return;
            }

            link.data().hoverZoomDailyMotionVideoId = videoId;
            link.data().hoverZoomDailyMotionVideoUrl = undefined;

            // clean previous result
            link.data().hoverZoomSrc = [];
            getVideoFromAPI(videoId, link);
        })

        function getVideoFromAPI(videoId, link) {
            chrome.runtime.sendMessage({action:'ajaxRequest',
                                        method:'GET',
                                        url:'https://www.dailymotion.com/player/metadata/video/' + videoId,
                                        headers:[{"header":"Content-Type","value":"application/json"}]},
                                        function (response) {
                                            try {
                                                let j = JSON.parse(response);
                                                let videoUrl = j.qualities.auto[0].url;
                                                if (videoUrl) {
                                                    link.data().hoverZoomDailyMotionVideoUrl = videoUrl;
                                                    link.data().hoverZoomSrc = [videoUrl];
                                                    callback(link, name);
                                                    hoverZoom.displayPicFromElement(link);
                                                }
                                            } catch {}
                                        });
        }

        function getVideosFromAPI(videoId, link, nb, idx) {
            chrome.runtime.sendMessage({action:'ajaxRequest',
                                        method:'GET',
                                        url:'https://www.dailymotion.com/player/metadata/video/' + videoId,
                                        headers:[{"header":"Content-Type","value":"application/json"}]},
                                        function (response) {
                                            try {
                                                let j = JSON.parse(response);
                                                let videoUrl = j.qualities.auto[0].url;
                                                if (videoUrl) {
                                                    link.data().hoverZoomDailyMotionPlaylistUrls.push({'videoUrl':videoUrl, 'idx':idx});
                                                    if (link.data().hoverZoomGallerySrc.length == nb) {
                                                        // sort urls
                                                        link.data().hoverZoomDailyMotionPlaylistUrls = link.data().hoverZoomDailyMotionPlaylistUrls.sort(function(a,b) { if (parseInt(a.idx) < parseInt(b.idx)) return -1; return 1;}).map(o => [o.videoUrl]);
                                                        link.data().hoverZoomGallerySrc = link.data().hoverZoomDailyMotionPlaylistUrls;
                                                        link.data().hoverZoomSrc = undefined;
                                                        link.addClass('hoverZoomLinkFromPlugIn');
                                                        callback(link, name);
                                                        hoverZoom.displayPicFromElement(link);
                                                    }
                                                }
                                            } catch {}
                                        });
        }
    }
});