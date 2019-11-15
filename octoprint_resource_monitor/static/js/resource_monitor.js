$(function() {
    function ResourceMonitorViewModel(parameters) {
        var self = this;
        self.settingsViewModel = parameters[0];

        self.cpuPlotData = null;

        var cpuOptions = {
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
                self.plot = $.plot($("#resource-monitor-cpu"), [[]], cpuOptions);
            }
        };
        self.current = 0;
        self.onDataUpdaterPluginMessage = function(plugin, message) {
            if(plugin == "resource_monitor") {
                if(self.cpuPlotData === null) {
                    self.cpuPlotData = [];
                    message.cpu.forEach(cpuUsage => {
                        self.cpuPlotData.push([]);
                    });
                }
                for(var i = 0; i < message.cpu.length; i++) {
                    self.cpuPlotData[i].push([self.current, message.cpu[i]]);
                    if(self.cpuPlotData[i].length > 50) {
                        self.cpuPlotData[i].shift();
                    }
                }
                self.current++;
                self.plot.setData(self.cpuPlotData);
                self.plot.setupGrid();
                self.plot.draw();
            }
        };
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
