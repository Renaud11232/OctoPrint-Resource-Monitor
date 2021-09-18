import psutil
import time


class Monitor:

	def __init__(self, network_exceptions, disk_exceptions, logger):
		self.__logger = logger
		self.__init_process()
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
		if "soc_thermal" in temp:
			cpu_temp = temp["soc_thermal"][0]._asdict()
		return cpu_temp

	def __init_process(self):
		self.__process = psutil.Process()
		self.__logger.debug("self.__process is now %r" % (self.__process,))
		# First call so it does not return 0 on next call
		self.__process.cpu_percent()

	def get_cpu(self):
		cpu_freq = psutil.cpu_freq()
		self.__logger.debug("cpu_freq() : %r" % (cpu_freq,))
		cores = psutil.cpu_percent(percpu=True)
		self.__logger.debug("cpu_percent(percpu=True) : %r" % (cores,))
		average = psutil.cpu_percent()
		self.__logger.debug("cpu_percent() : %r" % (average,))
		core_count = psutil.cpu_count(logical=False)
		self.__logger.debug("cpu_count(logical=False) : %r" % (core_count,))
		thread_count = psutil.cpu_count(logical=True)
		self.__logger.debug("cpu_count(logical=True) : %r" % (thread_count,))
		pids = len(psutil.pids())
		self.__logger.debug("len(pids()) : %r" % (pids,))
		boot_time = psutil.boot_time()
		self.__logger.debug("boot_time() : %r" % (boot_time,))
		return dict(
			cores=cores,
			average=average,
			frequency=cpu_freq._asdict() if cpu_freq else dict(),
			core_count=core_count,
			thread_count=thread_count,
			pids=pids,
			uptime=int(time.time() - boot_time),
			octoprint=self.__get_octoprint_cpu(average)
		)

	def __init_children(self):
		try:
			self.__children = self.__process.children(recursive=True)
		except psutil.NoSuchProcess:
			self.__logger.debug("No process found when calling children(recursive=True) on %r" % (self.__process,))
			self.__init_process()
			self.__children = self.__process.children(recursive=True)
		for child in self.__children:
			# First call so it does not return 0 on next call, process might die between calls
			try:
				child.cpu_percent()
			except psutil.NoSuchProcess:
				self.__logger.debug("No process found when calling cpu_percent() on %r" % (child,))
				pass

	def __get_octoprint_cpu(self, average):
		try:
			# Don't know why and how
			# But his can sometimes raise a NoSuchProcessException
			total_cpu = self.__process.cpu_percent()
		except psutil.NoSuchProcess:
			self.__logger.debug("No process found when calling cpu_percent() on %r" % (self.__process,))
			self.__init_process()
			total_cpu = self.__process.cpu_percent()
		for child in self.__children:
			try:
				total_cpu += child.cpu_percent()
			except psutil.NoSuchProcess:
				self.__logger.debug("No process found when calling cpu_percent() on %r" % (child,))
				pass
		self.__init_children()
		cpu_count = psutil.cpu_count()
		self.__logger.debug("cpu_count() : %r" % (cpu_count,))
		return min(total_cpu / cpu_count, average)

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
			self.__logger.debug("sensors_temperatures() : %r" % (temps_celsius,))
			temps_fahrenheit = psutil.sensors_temperatures(fahrenheit=True)
			self.__logger.debug("sensors_temperatures(fahrenheit=True) : %r" % (temps_fahrenheit,))
		temps_c = self.__get_cpu_temp(temps_celsius)
		temps_f = self.__get_cpu_temp(temps_fahrenheit)
		return dict(
			celsius=temps_c if temps_c else dict(),
			fahrenheit=temps_f if temps_f else dict()
		)

	def get_memory(self):
		virtual_memory = psutil.virtual_memory()
		self.__logger.debug("virtual_memory() : %r" % (virtual_memory,))
		return virtual_memory._asdict()

	def get_partitions(self, all):
		disk_partitions = psutil.disk_partitions()
		self.__logger.debug("disk_partitions() : %r" % (disk_partitions,))
		partitions = [partition._asdict() for partition in disk_partitions if partition.fstype and (all or partition.mountpoint not in self.__disk_exceptions)
									and partition.fstype not in ["squashfs"]]
		for partition in partitions:
			disk_usage = psutil.disk_usage(partition["mountpoint"])
			self.__logger.debug('disk_usage(partition["mountpoint"] : %r' % (disk_usage,))
			partition.update(disk_usage._asdict())
		return partitions

	def get_network(self, all):
		io_counters = psutil.net_io_counters(pernic=True)
		self.__logger.debug("net_io_counters(pernic=True) : %r" % (io_counters,))
		addrs = psutil.net_if_addrs()
		self.__logger.debug("net_if_addrs() : %r" % (addrs,))
		stats = psutil.net_if_stats()
		self.__logger.debug("net_if_stats() : %r" % (stats,))
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
		self.__logger.debug("sensors_battery() : %r" % (bat,))
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
