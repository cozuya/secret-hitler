const mongoose = require('mongoose');
const { Schema } = mongoose;
const Config = new Schema({
  for: String,
  created: Date,
  data: Object
  /*
   * Data Model
   *  - ELO Regression
   *     enabled: Boolean,
   *     overallMedian: Number,
   *     maximumOverallLossPerDay: Number,
   *     seasonalMedian: Number,
   *     maximumSeasonalLossPerDay: Number,
   *     gracePeriod: Number
   */
});

module.exports = mongoose.model('Config', Config);
