/*************************************************************************************************
 * Copyright © 2017-2018 Mikhail Perelygin <zmey3301@gmail.com>. All rights reserved.
 * Huge thanks to:
 *     Sergey Koshevarov <gondragos@gmail.com> for plugin idea;
 *     Maxim Logvinov <skovorodker.rekdo@gmail.com> for optimisation ideas;
 * Program is distributed under the terms of the GNU Affero General Public License.
 *
 * @date         7.7.2018
 * @license     AGPL-3.0-or-later
 ************************************************************************************************/
import defaults from 'lodash.defaults'
import throttle from 'lodash.throttle'

export default class {
	/**
	 * Vue plugin install function
	 * @param Vue
	 * @param {Object} config: adaptive configuration file
	 */
	static install (Vue, config) {
		const adaptive = new this(Vue, config)
		Vue.adaptive = adaptive
		Object.defineProperty(Vue.prototype, "$adaptive", {
			get: () => adaptive
		})
	}
	/**
	 * Splitting configuration and creating eventListeners
	 * @param Vue
	 * @param {Object} config: adaptive configuration file
	 * @returns {Record<string, *>}: reactive model, based on Vue
	 */
	constructor (Vue, config) {
		// Defaults
		const defaultGlobal = {
			throttle: 17,
			orientationTestCount: 50,
			orientationChangeTimeout: 1000
		}
		const defaultConfig = {
			if: false,
			element: window,
			rem: false,
			from: false,
			to: false,
			base: false,
			k: 1
		}
		// Global config
		this.globals = defaults(config.global, defaultGlobal)
		delete config.global
		let deviceList = {}
		for (let device in config) {
			if (config.hasOwnProperty(device)) {
				defaults(config[device], defaultConfig)
				device = device.split(':')[0]
				if (!deviceList.hasOwnProperty(device)) deviceList[device] = false
			}
		}
		this.config = config
		let data = {
			is: deviceList,
			width: 0,
			height: 0,
			rem: 0
		}
		this.VM = new Vue({ data })

		// Listening to change events
		window.addEventListener('resize', throttle(this.resize.bind(this, false), this.globals.throttle))
		window.addEventListener('orientationchange', this.orientationChange.bind(this))
		// Initializing Adaptive
		this.resize(true)

		return this.VM.$data
	}

	/**
	 * Handle resize of viewport
	 * @param init: initialize flag
	 */
	resize (init = false) {
		const html = document.documentElement
		let cache = {
			window: {
				width: html.offsetWidth,
				height: html.offsetHeight
			}
		}
		let newDeviceList = {}
		let rem = 10
		// Setting viewport size
		if (this.VM.$data.width !== cache.window.width) this.VM.$data.width = cache.window.width
		if (this.VM.$data.height !== cache.window.height) this.VM.$data.height = cache.window.height
		for (let name in this.config) {
			if (this.config.hasOwnProperty(name)) {
				let device = this.config[name]
				// Getting device name
				name = name.split(':')[0]
				// Caching elements viewport
				let data
				if (typeof device.element === 'string' && !cache.hasOwnProperty(device.element)) {
					let el = document.querySelector(device.element)
					data = cache[device.element] = {
						width: el.innerWidth,
						height: el.innerHeight
					}
				} else if (typeof device.element === 'string') data = cache[device.element]
				else if (typeof device.element !== 'string') data = cache['window']
				// Detecting is breakpoints valid
				// Testing if function
				let checked = !(device.if && typeof device.if === 'function' && !device.if(data) ||
					// Testing min viewport
					device.from && (device.from.width > data.width || device.from.height > data.height) ||
					// Testing max viewport
					device.to && (device.to.width <= data.width || device.to.height <= data.height))
				// Testing classes
				if (!newDeviceList.hasOwnProperty(name) || !newDeviceList[name]) newDeviceList[name] = checked
				// Scale changing
				if (checked) {
					// Setting static rem
					if (device.rem) {
						rem = device.rem
						// Setting dynamic rem
					} else if (device.base) {
						let remBases = []
						if (device.base.width) {
							remBases.push(data.width / device.base.width)
						}
						if (device.base.height) {
							remBases.push(data.height / device.base.height)
						}
						let remBase = Math.min(...remBases)
						let k = device.k || 1
						rem = remBase * k * 10
					}
				}
			}
		}
		// Setting device
		for (let name in newDeviceList) {
			if (newDeviceList.hasOwnProperty(name)) {
				let checked = newDeviceList[name]
				let oldClass = this.VM.$data.is[name] ? name : `no-${name}`
				let newClass = checked ? name : `no-${name}`
				// Updating classes if changed
				if (oldClass !== newClass || init) {
					if (!init) html.classList.remove(oldClass)
					html.classList.add(newClass)
					this.VM.$data.is[name] = checked
				}
			}
		}
		if (rem !== this.VM.$data.rem) {
			html.style.fontSize = `${rem}px`
			this.VM.$data.rem = rem
		}
	}

	/**
	 * Handle orientationChange event
	 */
	orientationChange () {
		let noChangeCount = 0

		let end = function () {
			clearInterval(interval)
			clearTimeout(timeout)
			interval = null
			timeout = null
		}
		let html = document.documentElement
		let interval = setInterval(() => {
			let currHeight = html.offsetHeight
			let currWidth = html.offsetWidth
			if (currWidth === this.VM.$data.width && currHeight === this.VM.$data.height) {
				noChangeCount++
				if (noChangeCount === this.globals.orientationTestCount) {
					end()
				}
			} else {
				this.VM.$data.width = currWidth
				this.VM.$data.height = currHeight
				this.resize()
				noChangeCount = 0
			}
		}, this.globals.throttle)
		let timeout = setTimeout(function () {
			end()
		}, this.globals.orientationChangeTimeout)
	}
}
