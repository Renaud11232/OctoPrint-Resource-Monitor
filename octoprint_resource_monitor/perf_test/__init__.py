from threading import Thread
import psutil
import inspect
import os
from timeit import default_timer as timer


class PerformanceTester:

	def __init__(self, message_function):
		self.__push_perf = message_function
		self.__templ = "%-25s %s"

	def start_test(self):
		self.__timings = []
		thread = Thread(target=self.__do_perf_test)
		thread.start()

	def __timecall(self, title, fun, *args, **kw):
		t = timer()
		fun(*args, **kw)
		elapsed = timer() - t
		self.__timings.append((title, elapsed))

	def __print_timings(self):
		self.__timings.sort(key=lambda x: x[1])
		while self.__timings[:]:
			title, elapsed = self.__timings.pop(0)
			s = self.__templ % (title, "%f" % elapsed)
			self.__print_line(s)

	def __print_line(self, s):
		self.__push_perf(dict(
			perf_test=True,
			content=s
		))

	def __do_perf_test(self):
		public_apis = []
		ignore = ['wait_procs', 'process_iter', 'win_service_get', 'win_service_iter']
		if psutil.MACOS:
			ignore.append('net_connections')  # raises AD
		for name in psutil.__all__:
			obj = getattr(psutil, name, None)
			if inspect.isfunction(obj):
				if name not in ignore:
					public_apis.append(name)

		self.__print_line(self.__templ % ("SYSTEM APIS", "SECONDS"))
		self.__print_line("-" * 34)
		for name in public_apis:
			fun = getattr(psutil, name)
			args = ()
			if name == 'pid_exists':
				args = (os.getpid(), )
			elif name == 'disk_usage':
				args = (os.getcwd(), )
			self.__timecall(name, fun, *args)
		self.__timecall('cpu_count (cores)', psutil.cpu_count, logical=False)
		self.__timecall('process_iter (all)', lambda: list(psutil.process_iter()))
		self.__print_timings()

		# --- process
		self.__print_line("")
		self.__print_line(self.__templ % ("PROCESS APIS", "SECONDS"))
		self.__print_line("-" * 34)
		ignore = ['send_signal', 'suspend', 'resume', 'terminate', 'kill', 'wait', 'as_dict', 'parent', 'parents', 'memory_info_ex', 'oneshot', 'pid', 'rlimit']
		if psutil.MACOS:
			ignore.append('memory_maps')  # XXX
		p = psutil.Process()
		for name in sorted(dir(p)):
			if not name.startswith('_') and name not in ignore:
				fun = getattr(p, name)
				self.__timecall(name, fun)
		self.__print_timings()
		self.__print_line("DONE")
