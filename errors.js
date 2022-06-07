function TrackRepoError(message, code) {
    this.message = message;
    this.code = code;
}
TrackRepoError.prototype.toString = function () {
    return this.message;
};

module.exports.TrackRepoError = TrackRepoError;
