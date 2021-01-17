import psutil
import time


class Monitor:

	def __init__(self, network_exceptions, disk_exceptions):
		self.__process = psutil.Process()
		# First call so it does not return 0 on next call
		self.__process.cpu_percent()
		self.__init_children()
		self.__network_exceptions = network_exceptions
		self.__disk_exceptions = disk_exceptions

	def __get_cpu_temp(self, temp):
		if temp is None:
			return None
		cpu_temp = None
		if "coretemp" in temp:
			cpu_temp = temp["coretemp"][0]._asdict()
		if "cpu-thermal" in temp:
			cpu_temp = temp["cpu-thermal"][0]._asdict()
		if "cpu_thermal" in temp:
			cpu_temp = temp["cpu_thermal"][0]._asdict()
		return cpu_temp

	def get_cpu(self):
		cpu_freq = psutil.cpu_freq()
		return dict(
			cores=psutil.cpu_percent(percpu=True),
			average=psutil.cpu_percent(),
			frequency=cpu_freq._asdict() if cpu_freq else dict(),
			core_count=psutil.cpu_count(logical=False),
			thread_count=psutil.cpu_count(logical=True),
			pids=len(psutil.pids()),
			uptime=int(time.time() - psutil.boot_time()),
			octoprint=self.__get_octoprint_cpu()
		)

	def __init_children(self):
		self.__children = self.__process.children(recursive=True)
		for child in self.__children:
			# First call so it does not return 0 on next call, process might be die between calls
			try:
				child.cpu_percent()
			except psutil.NoSuchProcess:
				pass

	def __get_octoprint_cpu(self):
		total_cpu = self.__process.cpu_percent()
		for child in self.__children:
			try:
				total_cpu += child.cpu_percent()
			except psutil.NoSuchProcess:
				pass
		self.__init_children()
		return total_cpu / psutil.cpu_count()

	def get_cpu_temp(self):
		# return dict(
		# 	celsius=dict(
		# 		current=20
		# 	),
		# 	fahrenheit=dict(
		# 		current=50
		# 	)
		# )
		temps_celsius = None
		temps_fahrenheit = None
		if hasattr(psutil, "sensors_temperatures"):
			temps_celsius = psutil.sensors_temperatures()
			temps_fahrenheit = psutil.sensors_temperatures(fahrenheit=True)
		temps_c = self.__get_cpu_temp(temps_celsius)
		temps_f = self.__get_cpu_temp(temps_fahrenheit)
		return dict(
			celsius=temps_c if temps_c else dict(),
			fahrenheit=temps_f if temps_f else dict()
		)

	def get_memory(self):
		return psutil.virtual_memory()._asdict()

	def get_partitions(self, all):
		partitions = [partition._asdict() for partition in psutil.disk_partitions() if partition.fstype and (all or partition.mountpoint not in self.__disk_exceptions)
									and partition.fstype not in ["squashfs"]]
		for partition in partitions:
			partition.update(psutil.disk_usage(partition["mountpoint"])._asdict())
		return partitions

	def get_network(self, all):
		io_counters = psutil.net_io_counters(pernic=True)
		addrs = psutil.net_if_addrs()
		stats = psutil.net_if_stats()
		final = []
		for nic_name in io_counters:
			if all or nic_name not in self.__network_exceptions:
				nic = dict(
					name=nic_name,
					addrs=[addr._asdict() for addr in addrs[nic_name]]
				)
				nic.update(io_counters[nic_name]._asdict())
				if nic_name in stats:
					nic.update(stats[nic_name]._asdict())
				final.append(nic)
		return final

	def get_battery(self):
		# return dict(
		# 	percent=94,
		# 	secsleft=16628,
		# 	power_plugged=True
		# )
		bat = psutil.sensors_battery()
		if bat:
			return bat._asdict()
		return dict()

	def get_all_resources(self):
		return dict(
			cpu=self.get_cpu(),
			temp=self.get_cpu_temp(),
			memory=self.get_memory(),
			partitions=self.get_partitions(all=False),
			network=self.get_network(all=False),
			battery=self.get_battery()
		)
