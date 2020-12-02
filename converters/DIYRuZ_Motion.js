const {
    fromZigbeeConverters,
    toZigbeeConverters,
} = require('zigbee-herdsman-converters');

const bind = async (endpoint, target, clusters) => {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
};

const withEpPreffix = (converter) => ({
    ...converter,
    convert: (model, msg, publish, options, meta) => {
        const epID = msg.endpoint.ID;
        const converterResults = converter.convert(model, msg, publish, options, meta) || {};
        return Object.keys(converterResults)
            .reduce((result, key) => {
                result[`${key}_${epID}`] = converterResults[key];
                return result;
            }, {});
    },
});

const fz = {
    occupancy_sensor_type: {
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('occupancySensorType')) {
                return {occupancy_sensor_type: msg.data.occupancySensorType};
            }
        },
    },
};

const device = {
        zigbeeModel: ['DIYRuZ_Motion'],
        model: 'DIYRuZ_Motion',
        vendor: 'DIYRuZ',
        description: '[Motion sensor](http://modkam.ru/?p=1700)',
        supports: 'temperature, humidity, illuminance, contact, pressure, battery, occupancy',
        fromZigbee: [
            fromZigbeeConverters.temperature,
            fromZigbeeConverters.humidity,
            fromZigbeeConverters.illuminance,
            fromZigbeeConverters.pressure,
            fromZigbeeConverters.battery,
            fromZigbeeConverters.diyruz_contact,
            fromZigbeeConverters.occupancy,
            fz.occupancy_sensor_type,
        ],
        toZigbee: [
            toZigbeeConverters.occupancy_timeout,
            toZigbeeConverters.factory_reset,
        ],
        meta: {
            configureKey: 1,
            multiEndpoint: true,
        },
        configure: async (device, coordinatorEndpoint) => {
            const firstEndpoint = device.getEndpoint(1);
            const secondEndpoint = device.getEndpoint(2);
            const thirdEndpoint = device.getEndpoint(3);
            await bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg',
                'msTemperatureMeasurement',
                'msRelativeHumidity',
                'msPressureMeasurement',
                'msIlluminanceMeasurement',
            ]);
            await bind(secondEndpoint, coordinatorEndpoint, [
                'genOnOff',
            ]);
            await bind(thirdEndpoint, coordinatorEndpoint, [
                'msOccupancySensing',
            ]);

        const genPowerCfgPayload = [{
                attribute: 'batteryVoltage',
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'batteryPercentageRemaining',
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 0,
            }
        ];

        const msBindPayload = [{
            attribute: 'measuredValue',
            minimumReportInterval: 0,
            maximumReportInterval: 3600,
            reportableChange: 0,
        }];
        const genOnOffBindPayload = [{
            attribute: 'onOff',
            minimumReportInterval: 0,
            maximumReportInterval: 3600,
            reportableChange: 0,
        }];
        const msOccupancySensingBindPayload = [{
            attribute: 'occupancy',
            minimumReportInterval: 0,
            maximumReportInterval: 3600,
            reportableChange: 0,
        }];

            await firstEndpoint.configureReporting('genPowerCfg', genPowerCfgPayload);
            await firstEndpoint.configureReporting('msTemperatureMeasurement', msBindPayload);
            await firstEndpoint.configureReporting('msRelativeHumidity', msBindPayload);
            await firstEndpoint.configureReporting('msPressureMeasurement', msBindPayload);
            await firstEndpoint.configureReporting('msIlluminanceMeasurement', msBindPayload);
            await secondEndpoint.configureReporting('genOnOff', genOnOffBindPayload);
            await thirdEndpoint.configureReporting('msOccupancySensing', msOccupancySensingBindPayload);
        },
};

module.exports = device;