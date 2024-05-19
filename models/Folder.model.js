module.exports = (sequelize, Sequelize) => {
    const Folder = sequelize.define("folder", {
        fileName: {
            type: Sequelize.STRING
        },
        filePath: {
            type: Sequelize.STRING
        },
        fileTopic: {
            type: Sequelize.STRING
        }
    });

    return Folder;
};