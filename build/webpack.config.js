module.exports = {
    output: {
        filename: 'index.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['env', {
                                    modules: false
                                }]
                            ]
                        }
                    },
                    {
                        loader: 'eslint-loader',
                        options: {
                            failOnError: true
                        }
                    }
                ]
            }
        ]
    }
}
