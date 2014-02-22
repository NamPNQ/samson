samson.constant("MONTHS",
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
);

samson.constant("DAYS",
  [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]
);

samson.constant('STATUS_MAPPING',
  {
    "running": "plus-sign primary",
    "succeeded": "ok-sign success",
    "failed": "remove-sign danger",
    "pending": "minus-sign info",
    "cancelling": "exclamation-sign warning",
    "cancelled": "ban-circle danger",
    "errored": "question-sign danger"
  }
);

samson.filter("userFilter",
  function() {
    var hookSources = /^(?:travis|tddium|semaphore)$/i;

    return function(deploys, userType) {
      if (userType !== undefined && userType !== null) {
        return deploys.filter(function(deploy) {
          return (deploy.user.match(hookSources) !== null) === (userType === "Robot");
        });
      }
      return deploys;
    };
  }
);

samson.filter("stageFilter",
  function() {
    return function(deploys, stageType) {
      if (stageType !== undefined && stageType !== null) {
        return deploys.filter(function(deploy) {
          return deploy.stageType == stageType;
        });
      }
      return deploys;
    };
  }
);

samson.filter("statusFilter",
  function() {
    return function(deploys, status) {
      if (status !== undefined && status !== null) {
        switch (status) {
          case "Not finished":
            return deploys.filter(function(deploy) {
              return deploy.status === "running" || deploy.status === "pending";
            });
          case "Successful":
            return deploys.filter(function(deploy) {
              return deploy.status === "succeeded";
            });
          case "Non-successful":
            return deploys.filter(function(deploy) {
              return deploy.status === "failed" ||
                deploy.status === "cancelled" ||
                deploy.status === "cancelling" ||
                deploy.status === "errored";
            });
        }
      }
      return deploys;
    };
  }
);

samson.filter("statusToIcon",
  ["STATUS_MAPPING", function(STATUS_MAPPING) {
    return function(status) {
      return STATUS_MAPPING[status];
    };
  }]
);

samson.filter("fullDate",
  function() {
    return function(local) {
      return local.day + ", " + local.date + " " + local.month + " " + local.year;
    };
  }
);

samson.filter("localize",
  ["DAYS", "MONTHS", function(DAYS, MONTHS) {
    return function(ms) {
      var localDate = new Date(parseInt(ms));

      var day    = DAYS[localDate.getDay()],
          year   = localDate.getFullYear(),
          date   = localDate.getDate(),
          month  = MONTHS[localDate.getMonth()];

      return {
        year: year,
        month: month,
        date: date,
        day: day
      };
    };
  }]
);

samson.factory("Deploys",
  ["$filter", "$http", "$timeout", function($filter, $http, $timeout) {
    var localize = $filter("localize");

    var Deploys = {
      entries: [],
      page: 1,
      loading: false,
      theEnd: false,

      loadMore: function() {
        if (this.theEnd) { return; }

        Deploys.loading = true;

        $http.get("/deploys/recent.json", { params: { page: Deploys.page } }).
          success(function(data) {
            if (data && data.length) {
              this.page += 1;
            } else if (data.length === 0) {
              this.theEnd = true;
              return;
            }

            for (var i = 0; i < data.length; i++) {
              data[i].time = localize(data[i].time);
              this.entries.push(data[i]);
            }
          }.bind(Deploys)).
          error(function() {
            alert("Failed to load more entries");
          }).
          finally(function() {
            $timeout(function() { this.loading = false; }.bind(Deploys), 500);
          });
      }
    };

    return Deploys;
  }]
);

samson.controller("TimelineCtrl", ["$scope", "$window", "Deploys",
function($scope, $window, Deploys) {
  $scope.userTypes = ["Human", "Robot"];
  $scope.stageTypes = { "Production": true, "Non-production": false };
  $scope.deployStatuses = ["Successful", "Non-successful", "Not finished"];

  $scope.isSameDate = function(previous, current) {
    if (previous) {
      return previous.date === current.date &&
        previous.month === current.month &&
        previous.year === current.year;
    }
    return false;
  };

  $scope.timelineDeploys = Deploys;

  $scope.timelineDeploys.loadMore();

  angular.element($window).on("scroll", (function() {
    var html = document.querySelector("html");
    return function() {
      if ($window.scrollY >= html.scrollHeight - $window.innerHeight - 100 && !$scope.timelineDeploys.loading) {
        $scope.$apply($scope.timelineDeploys.loadMore);
      }
    };
  })());

  $scope.shortWindow = function() {
    return !$scope.timelineDeploys.theEnd && $window.scrollMaxY === 0;
  };
}]);