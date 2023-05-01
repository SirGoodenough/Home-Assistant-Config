const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require("zigbee-herdsman-converters/lib/tuya");

const tuya_cover =  {
    cluster: 'manuSpecificTuya',
    type: ['commandDataReport', 'commandDataResponse'],
    options: [exposes.options.invert_cover()],
    convert: (model, msg, publish, options, meta) => {
        // Protocol description
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1159#issuecomment-614659802

        const dpValue = tuya.firstDpValue(msg, meta, 'tuya_cover');
        const dp = dpValue.dp;
        const value = tuya.getDataValue(dpValue);

        switch (dp) {
        case tuya.dataPoints.coverPosition: // Started moving to position (triggered from Zigbee)
        case tuya.dataPoints.coverChange: // Started moving (triggered by transmitter or pulling on curtain)
            return {running: true};
        case tuya.dataPoints.coverArrived: { // Arrived at position
            const invert = tuya.isCoverInverted(meta.device.manufacturerName) ? !options.invert_cover : options.invert_cover;
            const position = invert ? 100 - (value & 0xFF) : (value & 0xFF);

            if (position > 0 && position <= 100) {
                return {running: false, position, state: 'OPEN'};
            } else if (position == 0) { // Report fully closed
                return {running: false, position, state: 'CLOSE'};
            } else {
                return {running: false}; // Not calibrated yet, no position is available
            }
        }
        case tuya.dataPoints.coverSpeed: // Cover is reporting its current speed setting
            return {motor_speed: value};
        case tuya.dataPoints.state: // Ignore the cover state, it's not reliable between different covers!
        case tuya.dataPoints.coverChange: // Ignore manual cover change, it's not reliable between different covers!
            break;
        case tuya.dataPoints.config: // Returned by configuration set; ignore
            break;
        default: // Unknown code
            meta.logger.warn(`TuYa_cover_control: Unhandled DP #${dp} for ${meta.device.manufacturerName}:
            ${JSON.stringify(dpValue)}`);
        }
    },
};

const definition = {
    zigbeeModel: [
        'owvfni3\u0000', 'owvfni3', 'u1rkty3', 'aabybja', // Curtain motors
        'mcdj3aq', 'mcdj3aq\u0000', // Tubular motors
    ],
    fingerprint: [
        // Curtain motors:
        {modelID: 'TS0601', manufacturerName: '_TZE200_5zbp6j0u'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_nkoabg8w'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_xuzcvlku'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_4vobcgd3'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_nogaemzt'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_r0jdjrvi'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_pk0sfzvr'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_fdtjuw7u'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_zpzndjez'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_wmcdj3aq'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_cowvfni3'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_rddyvrci'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_nueqqe6k'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_xaabybja'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_rmymn92d'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_3i3exuay'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_tvrvdj6o'},
        {modelID: 'zo2pocs\u0000', manufacturerName: '_TYST11_fzo2pocs'},
        // Roller blinds:
        {modelID: 'TS0601', manufacturerName: '_TZE200_sbordckq'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_fctwhugx'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_zah67ekd'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_hsgrhjpf'},
        // Window pushers:
        {modelID: 'TS0601', manufacturerName: '_TZE200_g5wdnuow'},
        // Tubular motors:
        {modelID: 'TS0601', manufacturerName: '_TZE200_fzo2pocs'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_5sbebbzs'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_zuz7f94z'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_zyrdrmno'},
        {modelID: 'TS0601', manufacturerName: '_TZE200_68nvbio9'},
        // Roman Rod - I Type - Curtains Track (Multi-Motor)
        {modelID: 'TS0601', manufacturerName: '_TZE200_cf1sl3tj'},
    ],
    model: 'TS0601_cover',
    vendor: 'TuYa',
    description: 'Curtain motor/roller blind motor/window pusher/tubular motor',
    whiteLabel: [
        {vendor: 'Yushun', model: 'YS-MT750'},
        {vendor: 'Zemismart', model: 'ZM79E-DT'},
        {vendor: 'Binthen', model: 'BCM100D'},
        {vendor: 'Binthen', model: 'CV01A'},
        {vendor: 'Zemismart', model: 'M515EGB'},
        {vendor: 'TuYa', model: 'M515EGZT'},
        {vendor: 'TuYa', model: 'DT82LEMA-1.2N'},
        {vendor: 'TuYa', model: 'ZD82TN', description: 'Curtain motor'},
        {vendor: 'Moes', model: 'AM43-0.45/40-ES-EB'},
        {vendor: 'Larkkey', model: 'ZSTY-SM-1SRZG-EU'},
        {vendor: 'Zemismart', model: 'ZM25TQ', description: 'Tubular motor'},
        {vendor: 'Zemismart', model: 'AM43', description: 'Roller blind motor'},
        {vendor: 'Zemismart', model: 'M2805EGBZTN', description: 'Tubular motor'},
        {vendor: 'Zemismart', model: 'BCM500DS-TYZ', description: 'Curtain motor'},
        {vendor: 'A-OK', model: 'AM25', description: 'Tubular motor'},
        {vendor: 'Alutech', model: 'AM/R-Sm', description: 'Tubular motor'},
        {vendor: 'Zemismart', model: 'ZM85EL-2Z', description: 'Roman Rod - I Type - Curtains Track'},
    ],
    fromZigbee: [tuya_cover, fz.ignore_basic_report],
    toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
    exposes: [
        e.cover_position().setAccess('position', ea.STATE_SET),
        exposes.binary('running', ea.STATE, true, false)
            .withDescription('Whether the motor is moving or not'),
        exposes.composite('options', 'options')
            .withFeature(exposes.numeric('motor_speed', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription('Motor speed'))],
};

module.exports = definition;
