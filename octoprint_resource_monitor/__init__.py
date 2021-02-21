# coding=utf-8
from __future__ import absolute_import

import flask
import octoprint.plugin
from octoprint.util import RepeatedTimer
import time
import math
from .monitor import Monitor


class ResourceMonitorPlugin(octoprint.plugin.SettingsPlugin,
							octoprint.plugin.StartupPlugin,
							octoprint.plugin.AssetPlugin,
							octoprint.plugin.TemplatePlugin,
							octoprint.plugin.BlueprintPlugin):

	def get_settings_defaults(self):
		return dict(
			network=dict(
				exceptions=[]
			),
			disk=dict(
				exceptions=[]
			),
			temperature=dict(
				unit="celsius"
			),
			refresh_rate=1,
			duration=60
		)

	def get_settings_version(self):
		return 1

	def interval(self):
		timestamp = time.time()
		return math.ceil(timestamp) - timestamp

	def check_resources(self):
		if not self._plugin_manager.registered_clients:  # No connected clients to UI
			return False
		message = self.__monitor.get_all_resources()
		self._plugin_manager.send_plugin_message(self._identifier, message)

	def on_after_startup(self):
		self.__monitor = Monitor(self._settings.get(["network", "exceptions"]),
								 self._settings.get(["disk", "exceptions"]), self._logger)
		RepeatedTimer(self.interval, self.check_resources).start()

	def get_assets(self):
		return dict(
			js=[
				"js/filesize.min.js",
				"js/resource_plot.js",
				"js/resource_monitor.js"
			],
			css=[
				"css/resource_monitor.css"
			]
		)

	def get_template_vars(self):
		return dict(
			partitions=self.__monitor.get_partitions(all=False),
			all_partitions=self.__monitor.get_partitions(all=True),
			network=self.__monitor.get_network(all=False),
			all_network=self.__monitor.get_network(all=True),
			cpu=self.__monitor.get_cpu(),
			temp=self.__monitor.get_cpu_temp(),
			battery=self.__monitor.get_battery()
		)

	@octoprint.plugin.BlueprintPlugin.route("/stats", methods=["GET"])
	def api(self):
		return flask.make_response(flask.jsonify(self.__monitor.get_all_resources()), 200)

	def get_update_information(self):
		return dict(
			resource_monitor=dict(
				displayName="Resource Monitor",
				displayVersion=self._plugin_version,

				type="github_release",
				user="Renaud11232",
				repo="OctoPrint-Resource-Monitor",
				current=self._plugin_version,

				pip="https://github.com/Renaud11232/OctoPrint-Resource-Monitor/archive/{target_version}.zip"
			)
		)


__plugin_name__ = "Resource Monitor"
__plugin_pythoncompat__ = ">=2.7,<4"


def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = ResourceMonitorPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
