module.exports = class Logger {
	constructor (fs, fileLocation = null) {
		this.fs = fs;
		this.fileLocation = fileLocation;
	}

	getDate() {
		let date_ob = new Date();
		let date = ("0" + date_ob.getDate()).slice(-2);
		let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
		let year = date_ob.getFullYear();
		return '' + year + month + date + '';
	}

	getDateAndHours() {
		let date_ob = new Date();
		let date = ("0" + date_ob.getDate()).slice(-2);
		let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
		let year = date_ob.getFullYear();
		let hours = date_ob.getHours().toString().padStart(2, '0');
		let minutes = date_ob.getMinutes().toString().padStart(2, '0');
		let seconds = date_ob.getSeconds().toString().padStart(2, '0');
		return `${year}/${month}/${date} - ${hours}:${minutes}:${seconds}`;
	}
	
	getFilename() {
		let date = this.getDate();
		return this.fileLocation + `/srb2kartlog-${date}`;
	}

	getErrorFilename() {
		let date = this.getDate();
		return this.fileLocation + `/srb2kartlog-errors-${date}`;
	}

	log(text, err = false) {
		let color = err ? "\x1b[31m" : "";
		let dateDisplay = this.getDateAndHours();
		console.log(`${color}[${dateDisplay}] ${text}\x1b[0m`);

		if (this.fileLocation) {
			let date = this.getDate();
			this.fs.appendFileSync(
				err ? this.getErrorFilename() : this.getFilename(),
				`\n[${dateDisplay}] ${text}`,
				{ flag: "a" }
			);
		}
	}
}
