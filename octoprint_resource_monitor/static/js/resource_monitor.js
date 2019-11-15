$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];
        var plotOptions = {
            yaxis: {
                min: 0,
                max: 100,
                tickFormatter: function(value, axis) {
                    return value + "%";
                }
            },
            xaxis: {
                show: false
            }
        }
        self.onAfterTabChange = function(current, previous) {
            if(current === "#tab_plugin_resource_monitor") {
                $.plot($("#resource-monitor-cpu"), [ [[0, 0], [1, 1]] ], plotOptions);
            }
        }
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: ResourceMonitorViewModel,
        dependencies: [
            "settingsViewModel"
        ],
        elements: [
            "#tab_plugin_resource_monitor"
        ]
    });
});
